import { CampaignStatus } from './../../../../../../packages/db/src/apps/modules/Campaign/campaign.constants'
import { stripe } from '@app/libs/stripe'
import { httpStatus } from 'http-status'
import mongoose from 'mongoose'
import {
  Campaign,
  CampaignStatus,
  Payment,
  PaymentBreakDown,
  paymentStatus,
  paymentType,
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
          new: true,
          session,
        }
      )

      await PaymentBreakDown.findOneAndUpdate({
        payment: payment?._id,
      }, { 
        organizerAmount: 
      })
    } catch (error) {
      console.log(error)
    }
  }

  //    const
}
