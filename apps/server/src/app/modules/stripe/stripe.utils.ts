import { stripe } from '@app/libs/stripe'
import httpStatus from 'http-status'
import moment from 'moment'
import mongoose from 'mongoose'
import {
  BrandBuilder,
  BrandBuilderPayment,
  brandBuilderStatus,
  Campaign,
  campaignLunchPaymentStatus,
  CampaignStatus,
  Donation,
  DonationPayment,
  DonationStatus,
  Order,
  OrderItem,
  OrderPayment,
  OrderStatus,
  Payment,
  PaymentBreakDown,
  paymentStatus,
  paymentType,
  Payout,
  PayoutPayment,
  PayoutStatus,
  PhysicalProduct,
  productType,
  PromoCode,
  PromoCodeUsage,
  Supporter,
  User,
  type TPaymentType,
} from '@repo/db'
import { AppError } from '@repo/shared'
import type Stripe from 'stripe'
import configs from '@app/configs'
import { sendEmail } from 'packages/email-sender/src'
import {
  CampaignLiveEmail,
  renderEmail,
  CampaignContributionOwnerNotificationEmail,
  BrandBuilderAdminNotificationEmail,
} from 'packages/email-templates/src'
import { getAdminEmails } from '@app/libs/get-admin-emails'
import {
  notifyBrandBuilderPaidOrganizer,
  notifyPayoutFailed,
  notifyPayoutPaid,
} from '@app/libs/notification-emails'
import { sendCampaignLiveNotification } from '../Campaign/campaign.utils'
import { logger } from '@app/libs/logger'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface TCampaignPaymentMetaData {
  organizerId: string
  campaignId: string
  paymentType: TPaymentType
  payableAmount?: number
  discountAmount?: number
  originalAmount?: number
}

interface TDonationPaymentMetaData {
  organizer: string
  campaign: string
  donation: string
  supporter: string
  paymentType: TPaymentType
  grossAmount: number // Customer pays this
  stripeFee: number
  platformFee: number
  organizerNetAmount: number
}

interface TOrderPaymentMetaData {
  organizer: string
  campaign: string
  order: string
  supporter: string
  paymentType: TPaymentType
  grossAmount: number // Customer pays this
  stripeFee: number
  platformFee: number
  shippingFee: number
  organizerNetAmount: number
  calculatedTaxId: string; 
  gstAmount: number;
  organizerRaisedAmount?: number; 
}

interface IBrandBuilderMeta {
  brandBuilderFee: number
  organizerId: string
  brandBuilderId: string
}

export const handleCampaignCheckoutPaymentSuccess = async (session: Stripe.Checkout.Session) => {
  if (session.payment_status !== 'paid') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment not paid yet.')
  }
  const { metadata } = session

  const { campaignId, organizerId, discountAmount, payableAmount, originalAmount } =
    metadata as unknown as TCampaignPaymentMetaData

  const paymentIntentId = session.payment_intent
  const sessionId = session.id

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId as string)

  let charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string)

  let retry = 5

  while (!charge.balance_transaction && retry > 0) {
    //console.log("Waiting for balance transaction...");

    await sleep(1000)

    charge = await stripe.charges.retrieve(charge.id)

    retry--
  }

  if (!charge.balance_transaction) {
    throw new AppError(httpStatus.NOT_FOUND, 'Balance transaction is not available yet.')
  }

  const balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction as string)

  const stripeOriginalAmount = balanceTx.net / 100
  const stripeFee = balanceTx.fee / 100

  //  ??  Check any campaign exists with this id and organization
  const campaign = await Campaign.findOne({
    _id: campaignId,
    organizer: organizerId,
    status: { $in: [CampaignStatus.DRAFT, CampaignStatus.PENDING] },
  })

  const durationDays = campaign?.durationDays ?? 1
  const startDate = moment().toDate()
  const endDate = moment().add(durationDays, 'days').toDate()
  const publishedAt = moment().toDate()

  if (campaign) {
    const session = await mongoose.startSession()

    try {
      session.startTransaction()
      const updateCampaign = await Campaign.findOneAndUpdate(
        {
          _id: campaign?._id,
        },
        {
          $set: {
            finalLaunchFee: stripeOriginalAmount,
            status: CampaignStatus.ACTIVE,
            paymentStatus: paymentStatus.PAID,
            startDate,
            endDate,
            publishedAt,
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        }
      )

      if (updateCampaign?.promoCode) {
        await PromoCodeUsage.findOneAndUpdate(
          {
            user: organizerId,
            promoCode: updateCampaign?.promoCode,
            campaign: updateCampaign?._id,
          },
          {
            $set: {
              usedAt: new Date(),
            },
          },
          {
            session,
          }
        )
      }

      const payment = await Payment.findOneAndUpdate(
        {
          campaign: campaign?._id,
          organizer: organizerId,
          paymentType: paymentType.LAUNCH_FEE,
          status: paymentStatus.PENDING,
        },
        {
          $set: {
            status: paymentStatus.PAID,
            stripeCheckoutSessionId: sessionId,
            stripePaymentIntentId: paymentIntent.id,
            stripeBalanceTransactionId: balanceTx.id,
            stripeChargeId: charge.id,
            paidAt: new Date(),
          },
        },
        {
          returnDocument: 'after',
          sort: { createdAt: -1 },
          session,
        }
      )

      if (!payment) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Payment not found!')
      }

      await PaymentBreakDown.create(
        [
          {
            payment: payment?._id,
            subtotal: originalAmount as number,
            totalAmount: stripeOriginalAmount as number,
            stripeFee: stripeFee as number,
            discountAmount: discountAmount as number,
          },
        ],
        { session }
      )

      await session.commitTransaction()

      const organizer = await User.findById(campaign?.organizer)

      if (organizer && campaign) {
        await sendCampaignLiveNotification(campaign, organizer, {
          isFreeLaunch: false,
          launchFee: stripeOriginalAmount as number,
        })
      }
    } catch (error) {
      await session.abortTransaction()
      console.log(error)
    } finally {
      await session.endSession()
    }
  }
}

export const handleBrandBuilderCheckoutPaymentSuccess = async (
  session: Stripe.Checkout.Session
) => {
  if (session.payment_status !== 'paid') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment not paid yet.')
  }

  console.log(session)
  const { metadata } = session

  const { brandBuilderId } = metadata as unknown as IBrandBuilderMeta

  const paymentIntentId = session.payment_intent
  const sessionId = session.id

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId as string)

  let charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string)

  let retry = 5

  while (!charge.balance_transaction && retry > 0) {
    //console.log("Waiting for balance transaction...");

    await sleep(1000)

    charge = await stripe.charges.retrieve(charge.id)

    retry--
  }

  if (!charge.balance_transaction) {
    throw new AppError(httpStatus.NOT_FOUND, 'Balance transaction is not available yet.')
  }

  const balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction as string)

  const amount = balanceTx.amount / 100
  const stripeOriginalAmount = balanceTx.net / 100
  const stripeFee = balanceTx.fee / 100

  const mongoSession = await mongoose.startSession()

  try {
    mongoSession.startTransaction()

    // Prevent duplicate webhook processing
    const existingPayment = await BrandBuilderPayment.findOne({
      stripeCheckoutSessionId: sessionId,
      status: paymentStatus.PAID,
    }).session(mongoSession)

    if (existingPayment) {
      await mongoSession.commitTransaction()
      return existingPayment
    }

    const payment = await BrandBuilderPayment.findOneAndUpdate(
      {
        stripeCheckoutSessionId: sessionId,
        status: {
          $ne: paymentStatus.PAID,
        },
      },
      {
        $set: {
          status: paymentStatus.PAID,
          amount: amount,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: charge.id,
          stripeBalanceTransactionId: balanceTx.id,
          paidAt: new Date(),
        },
      },
      {
        sort: {
          createdAt: -1,
        },
        new: true,
        session: mongoSession,
      }
    )

    if (!payment) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment not found.')
    }

    const paymentBreakdownExists = await PaymentBreakDown.findOne({
      payment: payment._id,
    }).session(mongoSession)

    if (!paymentBreakdownExists) {
      await PaymentBreakDown.create(
        [
          {
            payment: payment._id,
            subtotal: amount,
            totalAmount: stripeOriginalAmount,
            stripeFee,
          },
        ],
        {
          session: mongoSession,
        }
      )
    }

    const updatedBrandBuilder = await BrandBuilder.findOneAndUpdate(
      {
        _id: brandBuilderId,
      },
      {
        $set: {
          paidAmount: amount,
          status: brandBuilderStatus.PAID,
          paidAt: new Date(),
        },
      },
      {
        session: mongoSession,
        new: true,
      }
    )

    await mongoSession.commitTransaction()

    try {
      if (updatedBrandBuilder) {
        const organizer = await User.findById(updatedBrandBuilder.organizer)
        if (organizer?.email) {
          await notifyBrandBuilderPaidOrganizer({
            organizerName: organizer.name || 'Organizer',
            organizerEmail: organizer.email,
            businessName: updatedBrandBuilder.businessName || 'Brand Project',
            amountPaid: amount,
            sellingItem: updatedBrandBuilder.sellingItem,
            brandStyle: updatedBrandBuilder.brandStyle,
          })
        }
        const adminEmails = await getAdminEmails()

        if (adminEmails && adminEmails.length > 0) {
          const siteName = configs.site.name || 'FunRaisingIt'
          const adminTemplate = await renderEmail(
            BrandBuilderAdminNotificationEmail({
              businessName: updatedBrandBuilder.businessName || 'Brand Project',
              organizerName: organizer?.name || 'Organizer',
              organizerEmail: organizer?.email || '',
              organizerPhone: organizer?.phoneNumber,
              amountPaid: amount,
              sellingItem: updatedBrandBuilder.sellingItem,
              brandStyle: updatedBrandBuilder.brandStyle,
              budget: updatedBrandBuilder.budget,
              colors: updatedBrandBuilder.colors,
              placedAt: new Date().toLocaleString(),
              adminDashboardUrl: `${configs.site.clientUrl}/admin`,
              companyName: siteName,
              companyLogo: (configs.site.logo as string) || undefined,
            })
          )

          await Promise.allSettled(
            adminEmails.map((adminEmail) =>
              sendEmail({
                to: adminEmail,
                subject: `🎨 [Admin Alert] New Brand Builder Order: "${updatedBrandBuilder.businessName}" (${amount.toFixed(2)})`,
                html: adminTemplate.html,
                text: adminTemplate.text,
                fromName: `${siteName} System`,
                replyTo: configs.site.supportEmail || undefined,
              })
            )
          )
        }
      }
    } catch (emailErr) {
      logger.error('Failed to send brand builder order notification to admin:', emailErr)
    }
  } catch (error) {
    await mongoSession.abortTransaction()
    console.log(error)
  } finally {
    await mongoSession.endSession()
  }
}

export const handleCampaignCheckoutSessionExpired = async (
  checkoutSession: Stripe.Checkout.Session
) => {
  const metadata = checkoutSession.metadata as unknown as TCampaignPaymentMetaData

  if (!metadata) return

  const { campaignId, organizerId } = metadata

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    const payment = await Payment.findOne({
      campaign: campaignId,
      organizer: organizerId,
      paymentType: paymentType.LAUNCH_FEE,
      status: paymentStatus.PENDING,
    })
      .sort({ createdAt: -1 })
      .session(session)

    // Already processed or doesn't exist
    if (!payment || payment.status !== paymentStatus.PENDING) {
      await session.commitTransaction()
      return
    }

    const campaign = await Campaign.findOne({
      _id: campaignId,
      organizer: organizerId,
    }).session(session)

    if (!campaign) {
      throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
    }

    /**
     * Rollback promo reservation
     */
    if (campaign.promoCode) {
      await PromoCode.findByIdAndUpdate(
        campaign.promoCode,
        { $set: { usedCount: { $max: [{ $subtract: ['$usedCount', 1] }, 0] } } },
        { session }
      )

      await PromoCodeUsage.findOneAndDelete(
        {
          campaign: campaign._id,
          user: organizerId,
          promoCode: campaign.promoCode,
        },
        { session }
      )
    }

    /**
     * Reset campaign
     */
    await Campaign.findByIdAndUpdate(
      campaign._id,
      {
        $set: {
          promoCode: null,
          discountAmount: 0,
          finalLaunchFee: campaign.launchFee,
          paymentStatus: campaignLunchPaymentStatus.NOT_INITIATED,
        },
      },
      { session }
    )

    /**
     * Delete payment + breakdown
     */
    await PaymentBreakDown.deleteOne(
      {
        payment: payment._id,
      },
      { session }
    )

    await Payment.deleteOne(
      {
        _id: payment._id,
      },
      { session }
    )

    await session.commitTransaction()
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }
}


const sendDonationSuccessEmail = async ({
  to,
  donorName,
  campaignName,
  amount,
  donationId,
}: {
  to: string
  donorName: string
  campaignName: string
  amount: number
  donationId: string
}) => {
  const logo = configs.site.logo || 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png'
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <title>Donation Confirmation</title>
      <style>
        @media only screen and (max-width: 600px) {
          .email-body { padding: 12px 8px !important; }
          .email-container { width: 100% !important; max-width: 100% !important; border-radius: 10px !important; }
          .email-header { padding: 24px 16px !important; }
          .email-content { padding: 20px 16px !important; }
          .email-card { padding: 14px !important; }
        }
      </style>
    </head>
    <body class="email-body" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 30px 10px;">
      <div class="email-container" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        <div class="email-header" style="background: linear-gradient(135deg, #03AFA8 0%, #029690 100%); padding: 35px 20px; text-align: center; border-bottom: 4px solid #FE7B01;">
          <img src="${logo}" alt="${configs.site.name || 'FunRaisingIt'}" style="max-width: 170px; width: 100%; height: auto; margin-bottom: 12px; background: #ffffff; padding: 8px 16px; border-radius: 8px;" />
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Thank You for Your Donation! ❤️</h1>
        </div>
        <div class="email-content" style="padding: 30px 25px;">
          <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hi <strong>${donorName}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            We received your generous donation to support <strong>${campaignName}</strong>. Your contribution makes a real difference in helping them reach their goal!
          </p>
          <div class="email-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <div style="font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 15px;">
              Donation Receipt
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 12px 6px 0; color: #64748b; vertical-align: top; white-space: nowrap;">Campaign:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b; word-break: break-word;">${campaignName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 12px 6px 0; color: #64748b; white-space: nowrap;">Receipt ID:</td>
                <td style="padding: 6px 0; text-align: right; color: #64748b; font-family: monospace; white-space: nowrap;">#${donationId.slice(-8).toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 6px 12px 6px 0; color: #64748b; white-space: nowrap;">Date:</td>
                <td style="padding: 6px 0; text-align: right; color: #1e293b; white-space: nowrap;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              </tr>
              <tr style="border-top: 1px dashed #cbd5e1;">
                <td style="padding: 12px 12px 0 0; font-size: 16px; font-weight: 700; color: #0f172a; white-space: nowrap;">Total Donated:</td>
                <td style="padding: 12px 0 0 0; text-align: right; font-size: 18px; font-weight: 700; color: #03AFA8; white-space: nowrap;">$${amount.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
            Thank you once again for empowering community dreams. If you have any questions, feel free to contact us at <a href="mailto:${configs.site.supportEmail}" style="color: #03AFA8; text-decoration: none;">${configs.site.supportEmail}</a>.
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 18px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">
            © ${new Date().getFullYear()} ${configs.site.name || 'FunRaisingIt'}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
  await sendEmail({
    to,
    subject: `Thank you for supporting "${campaignName}"!`,
    html,
    fromName: configs.site.name || 'FunRaisingIt',
    replyTo: configs.site.supportEmail || undefined,
  })
}

const sendOrderSuccessEmail = async ({
  to,
  customerName,
  campaignName,
  order,
  items,
}: {
  to: string
  customerName: string
  campaignName: string
  order: {
    id: string
    subTotal: number
    shippingAmount: number
    gstAmount: number
    stripeFeeAmount: number
    totalAmount: number
    shippingType: string
  }
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    total: number
  }>
}) => {
  const logo = configs.site.logo || 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png'
  const deliveryLabel =
    order.shippingType === 'local_pickup'
      ? 'Local Pickup'
      : order.shippingType === 'local_delivery'
        ? 'Local Delivery'
        : 'Shipping'

  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #1e293b; font-weight: 500;">
          ${item.name}
          <div style="font-size: 12px; color: #64748b; font-weight: normal;">Qty: ${item.quantity} × $${item.unitPrice.toFixed(2)}</div>
        </td>
        <td style="padding: 10px 0; text-align: right; color: #1e293b; font-weight: 600;">
          $${item.total.toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <title>Order Confirmation</title>
      <style>
        @media only screen and (max-width: 600px) {
          .email-body { padding: 12px 8px !important; }
          .email-container { width: 100% !important; max-width: 100% !important; border-radius: 10px !important; }
          .email-header { padding: 24px 16px !important; }
          .email-content { padding: 20px 16px !important; }
          .email-card { padding: 14px !important; }
          .stack-col { display: block !important; width: 100% !important; text-align: left !important; padding-bottom: 4px !important; }
        }
      </style>
    </head>
    <body class="email-body" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 30px 10px;">
      <div class="email-container" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        <div class="email-header" style="background: linear-gradient(135deg, #03AFA8 0%, #029690 100%); padding: 35px 20px; text-align: center; border-bottom: 4px solid #FE7B01;">
          <img src="${logo}" alt="${configs.site.name || 'FunRaisingIt'}" style="max-width: 170px; width: 100%; height: auto; margin-bottom: 12px; background: #ffffff; padding: 8px 16px; border-radius: 8px;" />
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Order Confirmed! 🎉</h1>
        </div>
        <div class="email-content" style="padding: 30px 25px;">
          <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hi <strong>${customerName}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            Thank you for supporting <strong>${campaignName}</strong>! Your order has been placed and confirmed successfully.
          </p>
          <div class="email-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td class="stack-col" style="white-space: nowrap;"><span style="color: #64748b;">Order #:</span> <strong style="color: #0f172a;">${order.id.slice(-8).toUpperCase()}</strong></td>
                <td class="stack-col" style="text-align: right; white-space: nowrap;"><span style="color: #64748b;">Delivery:</span> <strong style="color: #03AFA8;">${deliveryLabel}</strong></td>
              </tr>
            </table>
          </div>
          <div style="margin: 25px 0;">
            <div style="font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 10px;">
              Items Ordered
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              ${itemsHtml}
            </table>
          </div>
          <div class="email-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 12px 4px 0; color: #64748b; white-space: nowrap;">Subtotal:</td>
                <td style="padding: 4px 0; text-align: right; color: #1e293b; white-space: nowrap;">$${order.subTotal.toFixed(2)}</td>
              </tr>
              ${order.shippingAmount > 0 ? `
                <tr>
                  <td style="padding: 4px 12px 4px 0; color: #64748b; white-space: nowrap;">Shipping Fee:</td>
                  <td style="padding: 4px 0; text-align: right; color: #1e293b; white-space: nowrap;">$${order.shippingAmount.toFixed(2)}</td>
                </tr>` : ''}
              ${order.gstAmount > 0 ? `
                <tr>
                  <td style="padding: 4px 12px 4px 0; color: #64748b; white-space: nowrap;">Estimated Tax:</td>
                  <td style="padding: 4px 0; text-align: right; color: #1e293b; white-space: nowrap;">$${order.gstAmount.toFixed(2)}</td>
                </tr>` : ''}
              ${order.stripeFeeAmount > 0 ? `
                <tr>
                  <td style="padding: 4px 12px 4px 0; color: #64748b; white-space: nowrap;">Processing Fee:</td>
                  <td style="padding: 4px 0; text-align: right; color: #1e293b; white-space: nowrap;">$${order.stripeFeeAmount.toFixed(2)}</td>
                </tr>` : ''}
              <tr style="border-top: 1px dashed #cbd5e1;">
                <td style="padding: 12px 12px 0 0; font-size: 16px; font-weight: 700; color: #0f172a; white-space: nowrap;">Total Paid:</td>
                <td style="padding: 12px 0 0 0; text-align: right; font-size: 18px; font-weight: 700; color: #03AFA8; white-space: nowrap;">$${order.totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
            If you ordered physical items for shipping or delivery, the organizer will handle the fulfillment. If you have any questions, you can contact us at <a href="mailto:${configs.site.supportEmail}" style="color: #03AFA8; text-decoration: none;">${configs.site.supportEmail}</a>.
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 18px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">
            © ${new Date().getFullYear()} ${configs.site.name || 'FunRaisingIt'}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
  await sendEmail({
    to,
    subject: `Your order confirmation for "${campaignName}" (#${order.id.slice(-8).toUpperCase()})`,
    html,
    fromName: configs.site.name || 'FunRaisingIt',
    replyTo: configs.site.supportEmail || undefined,
  })
}

export const handleDonationCheckoutPaymentSuccess = async (
  checkoutSession: Stripe.Checkout.Session
) => {
  if (checkoutSession.payment_status !== 'paid') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment not paid yet.')
  }

  const { metadata } = checkoutSession

  const { campaign: campaignId, donation: donationId } =
    metadata as unknown as TDonationPaymentMetaData

  const sessionId = checkoutSession.id
  const paymentIntentId = checkoutSession.payment_intent

  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment intent not found.')
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

  if (!paymentIntent.latest_charge || typeof paymentIntent.latest_charge !== 'string') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Charge not found.')
  }

  let charge = await stripe.charges.retrieve(paymentIntent.latest_charge)

  let retry = 5

  while (!charge.balance_transaction && retry > 0) {
    await sleep(1000)

    charge = await stripe.charges.retrieve(charge.id)

    retry--
  }

  if (!charge.balance_transaction) {
    throw new AppError(httpStatus.NOT_FOUND, 'Balance transaction is not available yet.')
  }

  const balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction as string)

  /**
   * Stripe calculation:
   *
   * Gross Amount
   *        |
   *        |- Stripe Fee
   *        |
   *        = balanceTx.net
   *
   * Organizer Amount:
   * balanceTx.net - Application Fee
   */

  const grossAmount = balanceTx.amount / 100
  const stripeFee = balanceTx.fee / 100
  const stripeNetAmount = balanceTx.net / 100

  let applicationFee = 0
  let applicationFeeId: string | undefined

  if (charge.application_fee) {
    const fee = await stripe.applicationFees.retrieve(charge.application_fee as string)

    applicationFeeId = fee.id
    applicationFee = fee.amount / 100
  }

  const realPlatformFee = Number((applicationFee - stripeFee)?.toFixed(2))
  const subtotal = Number((grossAmount - stripeFee)?.toFixed(2))
  const organizerNetAmount = Number((grossAmount - applicationFee)?.toFixed(2))
  const organizerRaisedAmount = Number((subtotal - realPlatformFee)?.toFixed(2))

  const mongoSession = await mongoose.startSession()

  try {
    mongoSession.startTransaction()

    // Prevent duplicate webhook processing
    const existingPayment = await DonationPayment.findOne({
      stripeCheckoutSessionId: sessionId,
      status: paymentStatus.PAID,
    }).session(mongoSession)

    if (existingPayment) {
      await mongoSession.commitTransaction()
      return existingPayment
    }

    const payment = await DonationPayment.findOneAndUpdate(
      {
        stripeCheckoutSessionId: sessionId,
        status: {
          $ne: paymentStatus.PAID,
        },
      },
      {
        $set: {
          status: paymentStatus.PAID,
          amount: grossAmount,

          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: charge.id,
          stripeApplicationFeeId: applicationFeeId,
          stripeBalanceTransactionId: balanceTx.id,

          paidAt: new Date(),
        },
      },
      {
        sort: {
          createdAt: -1,
        },
        new: true,
        session: mongoSession,
      }
    )

    if (!payment) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment not found.')
    }

    const paymentBreakdownExists = await PaymentBreakDown.findOne({
      payment: payment._id,
    }).session(mongoSession)

    if (!paymentBreakdownExists) {
      await PaymentBreakDown.create(
        [
          {
            payment: payment._id,

            subtotal,
            shippingFee: 0,
            gstAmount: 0,
            totalAmount: grossAmount,
            stripeFee,
            platformFee: realPlatformFee,
            organizerAmount: organizerNetAmount,
            organizerAmountWithoutShipping: organizerNetAmount,
            organizerRaisedAmount,
            discountAmount: 0,
          },
        ],
        {
          session: mongoSession,
        }
      )
    }

    // Update donation

    const donation = await Donation.findOneAndUpdate(
      {
        _id: donationId,
      },
      {
        $set: {
          totalAmount: grossAmount,
          status: DonationStatus.PAID,
        },
      },
      {
        session: mongoSession,
        new: true,
      }
    )

    if (!donation) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Donation failed to update.')
    }

    // Update campaign amount safely

    const campaign = await Campaign.findOneAndUpdate(
      {
        _id: campaignId,
      },
      {
        $inc: {
          raisedAmount: organizerRaisedAmount,
          raisedAmountWithShipping: organizerNetAmount,
        },
      },
      {
        session: mongoSession,
        new: true,
      }
    )

    if (!campaign) {
      throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
    }

    await mongoSession.commitTransaction()

    try {
      const supporter = await Supporter.findById(donation.supporter)
      const recipientEmail =
        supporter?.email || (checkoutSession.customer_details?.email as string)

      if (recipientEmail) {
        await sendDonationSuccessEmail({
          to: recipientEmail,
          donorName: donation.donorName || supporter?.name || 'Valued Supporter',
          campaignName: campaign.name,
          amount: grossAmount,
          donationId: donation._id.toString(),
        })
      }

      // Notify Campaign Organizer
      const organizer = await User.findById(campaign.organizer)
      if (organizer && organizer.email) {
        const ownerTemplate = await renderEmail(
          CampaignContributionOwnerNotificationEmail({
            organizerName: organizer.name || 'Organizer',
            campaignName: campaign.name,
            campaignCode: campaign.campaignCode,
            contributionType: 'donation',
            contributorName: donation.donorName || supporter?.name || 'A Generous Supporter',
            contributorEmail: recipientEmail,
            amountContributed: grossAmount,
            totalRaisedSoFar: campaign.raisedAmount,
            goalAmount: campaign.goalAmount,
            dashboardUrl: `${configs.site.clientUrl}/dashboard`,
            campaignUrl: `${configs.site.clientUrl}/campaign/${campaign.campaignCode}`,
            companyName: configs.site.name || 'FunRaisingIt',
            companyLogo: (configs.site.logo as string) || undefined,
            supportEmail: configs.site.supportEmail || undefined,
          })
        )

        await sendEmail({
          to: organizer.email,
          subject: `🎉 New Donation: ${grossAmount.toFixed(2)} received for "${campaign.name}"!`,
          html: ownerTemplate.html,
          text: ownerTemplate.text,
          fromName: configs.site.name || 'FunRaisingIt',
          replyTo: configs.site.supportEmail || undefined,
        })
      }
    } catch (emailErr) {
      logger.error('Failed to send donation confirmation email:', emailErr)
    }

    return payment
  } catch (error) {
    await mongoSession.abortTransaction()

    throw error
  } finally {
    await mongoSession.endSession()
  }
}

export const handleDonationCheckoutPaymentFailed = async (
  checkoutSession: Stripe.Checkout.Session
) => {
  const { metadata } = checkoutSession

  const { donation: donationId } = metadata as unknown as TDonationPaymentMetaData

  const sessionId = checkoutSession.id

  const mongoSession = await mongoose.startSession()

  try {
    mongoSession.startTransaction()

    // Prevent updating already completed payment
    const payment = await DonationPayment.findOne({
      stripeCheckoutSessionId: sessionId,
    }).session(mongoSession)

    if (!payment) {
      throw new AppError(httpStatus.NOT_FOUND, 'Payment not found.')
    }

    // If already paid, don't mark failed
    if (payment.status === paymentStatus.PAID) {
      await mongoSession.commitTransaction()
      return payment
    }

    const updatedPayment = await DonationPayment.findOneAndUpdate(
      {
        stripeCheckoutSessionId: sessionId,
      },
      {
        $set: {
          status: paymentStatus.FAILED,
        },
      },
      {
        session: mongoSession,
        new: true,
      }
    )

    if (!updatedPayment) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment update failed.')
    }

    // Update donation status
    if (donationId) {
      const donation = await Donation.findOneAndUpdate(
        {
          _id: donationId,
        },
        {
          $set: {
            status: DonationStatus.FAILED,
          },
        },
        {
          session: mongoSession,
          new: true,
        }
      )

      if (!donation) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Donation update failed.')
      }
    }

    await mongoSession.commitTransaction()

    return updatedPayment
  } catch (error) {
    await mongoSession.abortTransaction()

    throw error
  } finally {
    await mongoSession.endSession()
  }
}

export const handleDonationPaymentIntentFailed = async (paymentIntent: Stripe.PaymentIntent) => {
  const { metadata } = paymentIntent

  const { donation: donationId } = metadata as unknown as TDonationPaymentMetaData

  const paymentIntentId = paymentIntent.id

  const mongoSession = await mongoose.startSession()

  try {
    mongoSession.startTransaction()

    // Find payment
    const payment = await DonationPayment.findOne({
      stripePaymentIntentId: paymentIntentId,
    }).session(mongoSession)

    if (!payment) {
      throw new AppError(httpStatus.NOT_FOUND, 'Payment not found.')
    }

    // Already paid, don't update as failed
    if (payment.status === paymentStatus.PAID) {
      await mongoSession.commitTransaction()
      return payment
    }

    const updatedPayment = await DonationPayment.findOneAndUpdate(
      {
        stripePaymentIntentId: paymentIntentId,
      },
      {
        $set: {
          status: paymentStatus.FAILED,
        },
      },
      {
        session: mongoSession,
        new: true,
      }
    )

    if (!updatedPayment) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment failed update.')
    }

    // Update donation
    if (donationId) {
      const donation = await Donation.findOneAndUpdate(
        {
          _id: donationId,
        },
        {
          $set: {
            status: DonationStatus.FAILED,
          },
        },
        {
          session: mongoSession,
          new: true,
        }
      )

      if (!donation) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Donation failed update.')
      }
    }

    await mongoSession.commitTransaction()

    return updatedPayment
  } catch (error) {
    await mongoSession.abortTransaction()

    throw error
  } finally {
    await mongoSession.endSession()
  }
}
export const handleBrandBuilderPaymentIntentFailed = async (
  paymentIntent: Stripe.PaymentIntent
) => {
  const { metadata } = paymentIntent

  const { brandBuilderId } = metadata as unknown as IBrandBuilderMeta

  const paymentIntentId = paymentIntent.id

  const mongoSession = await mongoose.startSession()

  try {
    mongoSession.startTransaction()

    // Find payment
    const payment = await BrandBuilderPayment.findOne({
      stripePaymentIntentId: paymentIntentId,
    }).session(mongoSession)

    if (!payment) {
      throw new AppError(httpStatus.NOT_FOUND, 'Payment not found.')
    }

    // Already paid, don't update as failed
    if (payment.status === paymentStatus.PAID) {
      await mongoSession.commitTransaction()
      return payment
    }

    const updatedPayment = await BrandBuilderPayment.findOneAndUpdate(
      {
        stripePaymentIntentId: paymentIntentId,
      },
      {
        $set: {
          status: paymentStatus.FAILED,
        },
      },
      {
        session: mongoSession,
        new: true,
      }
    )

    if (!updatedPayment) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment failed update.')
    }

    // Update donation
    if (brandBuilderId) {
      const brandBuilder = await BrandBuilder.findOneAndUpdate(
        {
          _id: brandBuilderId,
        },
        {
          $set: {
            status: brandBuilderStatus.PAYMEMT_FAILED,
            failedAt: new Date(),
            failedReason: paymentIntent.last_payment_error,
          },
        },
        {
          session: mongoSession,
          new: true,
        }
      )

      if (!brandBuilder) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Brand builder failed to update.')
      }
    }

    await mongoSession.commitTransaction()

    return updatedPayment
  } catch (error) {
    await mongoSession.abortTransaction()

    throw error
  } finally {
    await mongoSession.endSession()
  }
}

export const handleOrderCheckoutPaymentSuccess = async (
  checkoutSession: Stripe.Checkout.Session
) => {
  if (checkoutSession.payment_status !== 'paid') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment not paid yet.')
  }

  const { metadata } = checkoutSession

  const {
    campaign: campaignId,
    order: orderId,
    shippingFee,
    gstAmount,
    calculatedTaxId,
  } = metadata as unknown as TOrderPaymentMetaData

  if (!campaignId || !orderId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid checkout metadata.')
  }

  const sessionId = checkoutSession.id
  const paymentIntentId = checkoutSession.payment_intent

  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment intent not found.')
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

  if (!paymentIntent.latest_charge || typeof paymentIntent.latest_charge !== 'string') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Charge not found.')
  }

  let charge = await stripe.charges.retrieve(paymentIntent.latest_charge)

  let retry = 5

  while (!charge.balance_transaction && retry > 0) {
    await sleep(1000)

    charge = await stripe.charges.retrieve(charge.id)

    retry--
  }

  if (!charge.balance_transaction) {
    throw new AppError(httpStatus.NOT_FOUND, 'Balance transaction is not available yet.')
  }

  const balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction as string)

  /**
   * Stripe calculation:
   *
   * Gross Amount
   *        |
   *        |- Stripe Fee
   *        |
   *        = balanceTx.net
   *
   * Organizer Amount:
   * balanceTx.net - Application Fee
   */

  // Tax Calculation:  
  let stripeTaxTxId: string | null = null; 
  let finalGstAmount = gstAmount || 0; 

  if (calculatedTaxId) {

    try {

    const calculation  = await stripe.tax.calculations.retrieve(calculatedTaxId)

    if (calculation.tax_amount_exclusive) {
        finalGstAmount = calculation.tax_amount_exclusive / 100     
    }   


    const taxTx = await stripe.tax.transactions.createFromCalculation({
      calculation: calculatedTaxId,
      reference: orderId,
    })


    if (taxTx.id) stripeTaxTxId = taxTx.id as string


  } catch (taxError) {
    logger.error('Failed to commit Stripe tax transaction', taxError)
  }

  }


  const grossAmount = balanceTx.amount / 100
  const stripeFee = balanceTx.fee / 100
  const stripeNetAmount = balanceTx.net / 100

  let applicationFee = 0
  let applicationFeeId: string | undefined

  if (charge.application_fee) {
    const fee = await stripe.applicationFees.retrieve(charge.application_fee as string)

    applicationFeeId = fee.id
    applicationFee = fee.amount / 100
  }

  const shippingAmount = Number(shippingFee ?? 0)
  const subtotal = Number((grossAmount - shippingAmount - finalGstAmount - stripeFee)?.toFixed(2))

  const organizerNetAmount = Number((grossAmount - applicationFee)?.toFixed(2))
  const organizerAmountWithoutShipping = Number((organizerNetAmount - shippingAmount)?.toFixed(2))
  const realPlatformFee = Number((applicationFee - stripeFee)?.toFixed(2))
  const organizerRaisedAmount = Number((subtotal - realPlatformFee)?.toFixed(2))

  const mongoSession = await mongoose.startSession()

  try {
    mongoSession.startTransaction()
    // ?? Check is the payment already paid ?:
    const existingPayment = await OrderPayment.findOne({
      stripeCheckoutSessionId: sessionId,
      status: paymentStatus.PAID,
    }).session(mongoSession)
    if (existingPayment) {
      await mongoSession.abortTransaction()
      return existingPayment
    }

    const payment = await OrderPayment.findOneAndUpdate(
      {
        stripeCheckoutSessionId: sessionId,
        status: paymentStatus.PENDING,
      },
      {
        $set: {
          status: paymentStatus.PAID,
          currency: balanceTx.currency,
          amount: grossAmount,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: charge.id,
          stripeApplicationFeeId: applicationFeeId,
          stripeBalanceTransactionId: balanceTx.id,
          stripeTaxTransactionId:  stripeTaxTxId,
          paidAt: new Date(),
          checkoutUrl: null,
        },
      },
      {
        returnDocument: 'after',
        session: mongoSession,
      }
    )

    if (!payment) {
      const existing = await OrderPayment.findOne({
        stripeCheckoutSessionId: sessionId,
        status: paymentStatus.PAID,
      }).session(mongoSession)

      if (existing) {
        await mongoSession.abortTransaction()
        return existing
      }

      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update payment')
    }

    const [paymentBreakdown] = await PaymentBreakDown.create(
      [
        {
          payment: payment._id,
          subtotal: subtotal,
          shippingFee: shippingAmount, 
          gstAmount: finalGstAmount,
          totalAmount: grossAmount,
          stripeFee,
          platformFee: realPlatformFee,
          organizerAmount: organizerNetAmount,
          organizerAmountWithoutShipping: organizerAmountWithoutShipping,
          organizerRaisedAmount: organizerRaisedAmount,
        },
      ],
      {
        session: mongoSession,
      }
    )

    if (!paymentBreakdown) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update payment breakdown')
    }

    // ?? Update Order Status
    const order = await Order.findOneAndUpdate(
      { _id: orderId },
      {
        $set: {
          subTotal: subtotal,
          shippingAmount: shippingAmount,
          totalAmount: grossAmount,
          gstAmount: finalGstAmount,
          stripeFeeAmount: stripeFee,
          stripeTaxCalculationId: calculatedTaxId,
          stripeTaxTransactionId: stripeTaxTxId,
          status: OrderStatus.PAID,
        },
      },
      {
        returnDocument: 'after',
        session: mongoSession,
      }
    )
    if (!order) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update order')
    }

    // ?? Update The campaign raised amount:
    const campaign = await Campaign.findOneAndUpdate(
      {
        _id: campaignId,
      },
      {
        $inc: {
          raisedAmount: organizerRaisedAmount,
          raisedAmountWithShipping: organizerNetAmount,
        },
      },
      {
        returnDocument: 'after',
        session: mongoSession,
      }
    )

    if (!campaign) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update order')
    }

    await mongoSession.commitTransaction()

    try {
      const supporter = await Supporter.findById(order.supporter)
      const recipientEmail =
        supporter?.email || (checkoutSession.customer_details?.email as string)

      const orderItems = await OrderItem.find({ order: order._id }).populate({
        path: 'product',
        select: 'name price productImage',
      })

      if (recipientEmail) {
        await sendOrderSuccessEmail({
          to: recipientEmail,
          customerName: order.customerName || supporter?.name || 'Valued Customer',
          campaignName: campaign.name,
          order: {
            id: order._id.toString(),
            subTotal: order.subTotal,
            shippingAmount: order.shippingAmount,
            gstAmount: order.gstAmount || 0,
            stripeFeeAmount: order.stripeFeeAmount || 0,
            totalAmount: order.totalAmount,
            shippingType: order.shippingType,
          },
          items: orderItems.map((item: any) => ({
            name: item.product?.name || 'Product',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: Number((item.quantity * item.unitPrice).toFixed(2)),
          })),
        })
      }

      // Notify Campaign Organizer
      const organizer = await User.findById(campaign.organizer)
      if (organizer && organizer.email) {
        const orderItemsSummary = orderItems.map((item: any) => ({
          name: item.product?.name || 'Product',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: Number((item.quantity * item.unitPrice).toFixed(2)),
        }))

        const ownerTemplate = await renderEmail(
          CampaignContributionOwnerNotificationEmail({
            organizerName: organizer.name || 'Organizer',
            campaignName: campaign.name,
            campaignCode: campaign.campaignCode,
            contributionType: 'order',
            contributorName: order.customerName || supporter?.name || 'A Customer',
            contributorEmail: recipientEmail,
            amountContributed: order.totalAmount,
            totalRaisedSoFar: campaign.raisedAmount,
            goalAmount: campaign.goalAmount,
            orderItems: orderItemsSummary,
            deliveryType: order.shippingType,
            dashboardUrl: `${configs.site.clientUrl}/dashboard`,
            campaignUrl: `${configs.site.clientUrl}/campaign/${campaign.campaignCode}`,
            companyName: configs.site.name || 'FunRaisingIt',
            companyLogo: (configs.site.logo as string) || undefined,
            supportEmail: configs.site.supportEmail || undefined,
          })
        )

        await sendEmail({
          to: organizer.email,
          subject: `🛍️ New Order: ${order.totalAmount.toFixed(2)} received for "${campaign.name}"!`,
          html: ownerTemplate.html,
          text: ownerTemplate.text,
          fromName: configs.site.name || 'FunRaisingIt',
          replyTo: configs.site.supportEmail || undefined,
        })
      }
    } catch (emailErr) {
      logger.error('Failed to send order confirmation email:', emailErr)
    }

    return payment
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction()
    }

    throw error
  } finally {
    await mongoSession.endSession()
  }
}

export const handleOrderCheckoutExpired = async (checkoutSession: Stripe.Checkout.Session) => {
  const mongoSession = await mongoose.startSession()

  try {
    mongoSession.startTransaction()
    const payment = await OrderPayment.findOneAndUpdate(
      {
        stripeCheckoutSessionId: checkoutSession.id,
        status: paymentStatus.PENDING,
      },
      {
        $set: {
          status: paymentStatus.FAILED,
          expiredAt: new Date(),
        },
      },
      {
        returnDocument: 'after',
        session: mongoSession,
      }
    )

    if (!payment) {
      await mongoSession.abortTransaction()
      return null
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      payment.order,
      {
        $set: {
          status: OrderStatus.PAYMENT_FAILED,
        },
      },
      {
        returnDocument: 'after',
        session: mongoSession,
      }
    )

    if (!updatedOrder) {
      throw new AppError(httpStatus.NOT_FOUND, 'Failed to update order.')
    }

    // ?? Check order items and release quantity for limited stock products:
    const orderItems = await OrderItem.find({
      order: updatedOrder._id,
    }).session(mongoSession)

    // ?? Restock products quantity (for limited quantity products)
    const restockPromises = orderItems?.map((orderItem) => {
      const reservedQuantity = orderItem?.quantity || 0

      return PhysicalProduct.findOneAndUpdate(
        {
          _id: orderItem?.product,
          productType: productType.PHYSICAL,
          isUnlimited: false,
        },
        {
          $inc: {
            stock: reservedQuantity,
          },
        },
        {
          returnDocument: 'after',
          session: mongoSession,
        }
      )
    })

    await Promise.all(restockPromises)

    await mongoSession.commitTransaction()
    return payment
  } catch (error) {
    await mongoSession.abortTransaction()
    throw error
  } finally {
    await mongoSession.endSession()
  }
}

export const handleOrderPaymentFailed = async (paymentIntent: Stripe.PaymentIntent) => {
  // ?? mongo session:
  const mongoSession = await mongoose.startSession()

  try {
    mongoSession.startTransaction()
    const payment = await OrderPayment.findOneAndUpdate(
      {
        stripePaymentIntentId: paymentIntent.id,
        status: paymentStatus.PENDING,
      },
      {
        $set: {
          status: paymentStatus.FAILED,
          failedAt: new Date(),
          failureReason: paymentIntent.last_payment_error?.message ?? 'Payment failed.',
        },
      },
      {
        returnDocument: 'after',
        session: mongoSession,
      }
    )

    if (!payment) {
      await mongoSession.abortTransaction()
      return null
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      payment.order,
      {
        $set: {
          status: OrderStatus.PAYMENT_FAILED,
        },
      },
      {
        returnDocument: 'after',
        session: mongoSession,
      }
    )

    if (!updatedOrder) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update the order.')
    }

    // ?? Check order items and release quantity for limited stock products:
    const orderItems = await OrderItem.find({
      order: updatedOrder._id,
    }).session(mongoSession)

    // ?? Restock products quantity (for limited quantity products)
    const restockPromises = orderItems?.map((orderItem) => {
      const reservedQuantity = orderItem?.quantity || 0

      return PhysicalProduct.findOneAndUpdate(
        {
          _id: orderItem?.product,
          productType: productType.PHYSICAL,
          isUnlimited: false,
        },
        {
          $inc: {
            stock: reservedQuantity,
          },
        },
        {
          returnDocument: 'after',
          session: mongoSession,
        }
      )
    })

    await Promise.all(restockPromises)

    await mongoSession.commitTransaction()
    return payment
  } catch (error) {
    await mongoSession.abortTransaction()
    throw error
  } finally {
    await mongoSession.endSession()
  }
}

export const handleBrandBuilderCheckoutExpired = async (
  checkoutSession: Stripe.Checkout.Session
) => {
  const mongoSession = await mongoose.startSession()

  try {
    mongoSession.startTransaction()
    const payment = await BrandBuilderPayment.findOneAndUpdate(
      {
        stripeCheckoutSessionId: checkoutSession.id,
        status: paymentStatus.PENDING,
      },
      {
        $set: {
          status: paymentStatus.FAILED,
          expiredAt: new Date(),
        },
      },
      {
        returnDocument: 'after',
        session: mongoSession,
      }
    )

    if (!payment) {
      await mongoSession.abortTransaction()
      return null
    }

    const brandBuilder = await BrandBuilder.findByIdAndUpdate(
      payment.brandBuilderId,
      {
        $set: {
          status: brandBuilderStatus.PAYMEMT_FAILED,
        },
      },
      {
        returnDocument: 'after',
        session: mongoSession,
      }
    )

    if (!brandBuilder) {
      throw new AppError(httpStatus.NOT_FOUND, 'Failed to update order.')
    }

    await mongoSession.commitTransaction()
    return payment
  } catch (error) {
    await mongoSession.abortTransaction()
    throw error
  } finally {
    await mongoSession.endSession()
  }
}

export const handlePayoutPaid = async (payout: Stripe.Payout) => {
  const payoutId = payout.id
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    const dbPayout = await Payout.findOneAndUpdate(
      { stripePayoutId: payoutId },
      { status: PayoutStatus.PAID, paidAt: new Date() },
      { new: true, session }
    )

    if (!dbPayout) {
      await session.abortTransaction()
      return
    }

    await PayoutPayment.findOneAndUpdate(
      { stripePayoutId: payoutId },
      { status: paymentStatus.PAID, paidAt: new Date() },
      { session }
    )

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      dbPayout.campaign,
      {
        status: CampaignStatus.PAID_OUT,
        paidOutAt: new Date(),
      },
      { session, new: true }
    )

    await session.commitTransaction()

    const organizer = await User.findById(dbPayout.organizer)
    if (organizer?.email && updatedCampaign) {
      await notifyPayoutPaid({
        organizerName: organizer.name || 'Organizer',
        organizerEmail: organizer.email,
        campaignName: updatedCampaign.name,
        campaignCode: updatedCampaign.campaignCode,
        amount: dbPayout.amount ?? (payout.amount / 100),
      })
    }
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}

export const handlePayoutFailed = async (payout: Stripe.Payout) => {
  const payoutId = payout.id
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    const dbPayout = await Payout.findOneAndUpdate(
      { stripePayoutId: payoutId },
      {
        status: PayoutStatus.FAILED,
        failedAt: new Date(),
        failureCode: payout.failure_code ?? 'unknown',
        failureMessage: payout.failure_message ?? 'Payout failed',
      },
      { new: true, session }
    )

    if (!dbPayout) {
      await session.abortTransaction()
      return
    }

    await PayoutPayment.findOneAndUpdate(
      { stripePayoutId: payoutId },
      { status: paymentStatus.FAILED, failedAt: new Date() },
      { session }
    )

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      dbPayout.campaign,
      {
        status: CampaignStatus.COMPLETED,
        expectedPayoutDate: moment().add(1, 'days').toDate(),
      },
      { session, new: true }
    )

    await session.commitTransaction()

    const organizer = await User.findById(dbPayout.organizer)
    if (updatedCampaign) {
      await notifyPayoutFailed({
        organizerName: organizer?.name || 'Organizer',
        organizerEmail: organizer?.email || '',
        campaignName: updatedCampaign.name,
        campaignCode: updatedCampaign.campaignCode,
        amount: dbPayout.amount ?? (payout.amount / 100),
        failureMessage: payout.failure_message ?? 'Payout transfer failed',
      })
    }
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}

export const handlePayoutCanceled = async (payout: Stripe.Payout) => {
  const payoutId = payout.id
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    const dbPayout = await Payout.findOneAndUpdate(
      { stripePayoutId: payoutId },
      { status: PayoutStatus.CANCELED, canceledAt: new Date() },
      { new: true, session }
    )

    if (!dbPayout) {
      await session.abortTransaction()
      return
    }

    await PayoutPayment.findOneAndUpdate(
      { stripePayoutId: payoutId },
      { status: paymentStatus.CANCELLED },
      { session }
    )

    await Campaign.findByIdAndUpdate(
      dbPayout.campaign,
      {
        status: CampaignStatus.COMPLETED,
        expectedPayoutDate: moment().add(1, 'days').toDate(),
      },
      { session }
    )

    await session.commitTransaction()
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}
