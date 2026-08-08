import {
  Account,
  accountStatus,
  AuthStatus,
  Campaign,
  DonationPayment,
  OrderPayment,
  Payment,
  paymentStatus,
  paymentType,
  type IUser,
} from '@repo/db'
import type { TGetPayoutOverviewForCampaignQuery } from './payout.validations'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import { stripe } from '@app/libs/stripe'
import moment from 'moment'

const getPayoutOverviewForCampaign = async (
  user: IUser,
  campaignId: string,
  query: TGetPayoutOverviewForCampaignQuery
) => {
  // ?? Check is campaign exists ?:
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, "Campaign doesn't exists.")
  }

  if (campaign?.organizer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, "This campaign doesn't belongs to your account.")
  }

  // ?? Get organization bank account id:
  const orgAccount = await Account.findOne({
    user: user?._id,
  })

  // ?? Calculate the payments for the campaign :
  const payments = await Payment.aggregate([
    {
      $match: {
        campaign: campaign._id,
        status: paymentStatus.PAID,
        paymentType: {
          $in: [paymentType.ORDER, paymentType.DONATION],
        },
      },
    },
    {
      $lookup: {
        from: 'paymentbreakdowns',
        localField: '_id',
        foreignField: 'payment',
        as: 'paymentDetails',
      },
    },
    {
      $unwind: {
        path: '$paymentDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        paymentId: '$_id',
        paymentType: 1,

        paymentBreakdownId: '$paymentDetails._id',
        subtotal: '$paymentDetails.subtotal',
        shippingFee: '$paymentDetails.shippingFee',
        totalAmount: '$paymentDetails.totalAmount',
        stripeFee: '$paymentDetails.stripeFee',
        platformFee: '$paymentDetails.platformFee',
        organizerAmount: '$paymentDetails.organizerAmount',
        organizerAmountWithoutShipping: '$paymentDetails.organizerAmountWithoutShipping',
        discountAmount: '$paymentDetails.discountAmount',
      },
    },
    {
      $group: {
        _id: null,

        // ORDER
        orderAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentType', paymentType.ORDER] }, '$totalAmount', 0],
          },
        },

        // DONATION
        donationAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentType', paymentType.DONATION] }, '$totalAmount', 0],
          },
        },

        // TOTAL
        totalAmount: {
          $sum: '$totalAmount',
        },

        organizerAmount: {
          $sum: '$organizerAmount',
        },
        organizerAmountWithoutShipping: {
          $sum: '$organizerAmountWithoutShipping',
        },

        stripeFee: {
          $sum: '$stripeFee',
        },

        platformFee: {
          $sum: '$platformFee',
        },

        shippingFee: {
          $sum: '$shippingFee',
        },
      },
    },
  ])

  // ?? Financial breakdown:
  const totalOrderAmount = Number(payments?.[0]?.orderAmount?.toFixed(2) ?? 0)
  const totalDonationAmount = Number(payments?.[0]?.donationAmount?.toFixed(2) ?? 0)
  const totalAmount = Number(payments?.[0]?.totalAmount?.toFixed(2) ?? 0)
  const organizerAmount = Number(payments?.[0]?.organizerAmount?.toFixed(2) ?? 0)
  const organizerAmountWithoutShipping = Number(
    payments?.[0]?.organizerAmountWithoutShipping?.toFixed(2) ?? 0
  )
  const stripeFee = Number(payments?.[0]?.stripeFee?.toFixed(2) ?? 0)
  const platformFee = Number(payments?.[0]?.platformFee?.toFixed(2) ?? 0)
  const shippingFee = Number(payments?.[0]?.shippingFee?.toFixed(2) ?? 0)

  // ?? Retrieved stripe  balance :
  const balance = await stripe.balance.retrieve(
    {},
    {
      stripeAccount: orgAccount?.account as string,
    }
  )

  const availableUsd = balance.available.find((item) => item.currency === 'usd')?.amount ?? 0
  const pendingUsd = balance.pending.find((item) => item.currency === 'usd')?.amount ?? 0

  // ??
  const endedAt = campaign?.endedAt ? campaign?.endedAt : campaign?.endDate
  const fundProcessingAt = moment(endedAt).add(1, 'day').toDate()
  const estimatedDepositFirstDate = campaign?.expectedPayoutDate
    ? moment(campaign?.expectedPayoutDate).add(2, 'day').toDate()
    : moment(fundProcessingAt).add(2, 'day').toDate()
  const estimatedDepositLastDate = campaign?.expectedPayoutDate
    ? moment(campaign?.expectedPayoutDate).add(3, 'day').toDate()
    : moment(fundProcessingAt).add(3, 'day').toDate()

  return {
    campaignId: campaign?._id,
    status: campaign?.status,
    endedAt,
    fundProcessingAt: fundProcessingAt,
    expectedPayoutDate: campaign?.expectedPayoutDate,
    estimatedDepositFirstDate,
    estimatedDepositLastDate,
    raisedAmount: campaign.raisedAmount,
    raisedAmountWithShipping: campaign.raisedAmountWithShipping,

    // Bank info:
    bankAccountId: orgAccount?._id ?? null,
    bankAccount: orgAccount?.account ?? null,
    bankAccountStatus: orgAccount?.status ?? null,
    isBankConnected: orgAccount ? true : false,
    needToTakeActionForBank: orgAccount?.status !== accountStatus.ACTIVE,

    // ?? Order Info:
    financialBreakdown: {
      totalOrderAmount,
      totalDonationAmount,
      totalAmount,
      organizerAmount,
      organizerAmountWithoutShipping,
      stripeFee,
      platformFee,
      shippingFee,
    },
    stripeBalance: {
      available: availableUsd,
      pending: pendingUsd,
    },
  }
}

export const payoutServices = {
  getPayoutOverviewForCampaign,
}
