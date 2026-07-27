import { stripe } from '@app/libs/stripe'
import httpStatus from 'http-status'
import moment from 'moment'
import mongoose from 'mongoose'
import {
  Campaign,
  campaignLunchPaymentStatus,
  CampaignStatus,
  Payment,
  PaymentBreakDown,
  paymentStatus,
  paymentType,
  PromoCode,
  PromoCodeUsage,
  type TPaymentType,
} from 'packages/db/src'
import { AppError } from 'packages/shared/src'
import type Stripe from 'stripe'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface TCampaignPaymentMetaData {
  organizerId: string
  campaignId: string
  paymentType: TPaymentType
  payableAmount?: number
  discountAmount?: number
  originalAmount?: number
}

export const handleCampaignCheckoutPaymentSuccess = async (session: Stripe.Checkout.Session) => {
  if (session.payment_status !== 'paid') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment not paid yet.')
  }
  const { metadata } = session

  const {
    campaignId,
    organizerId,
    paymentType: metaPaymentType,
    discountAmount,
    payableAmount,
    originalAmount,
  } = metadata as unknown as TCampaignPaymentMetaData

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

  console.log({
    payableAmount,
    paymentIntent: paymentIntent.id,
    chargeId: charge.id,
    transactionId: balanceTx.id,
    sessionId: sessionId,
    stripeOriginalAmount,
    stripeFee,
    meta: metadata,
  })

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
    } catch (error) {
      await session.abortTransaction()
      console.log(error)
    } finally {
      await session.endSession()
    }
  }

  //    const
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
