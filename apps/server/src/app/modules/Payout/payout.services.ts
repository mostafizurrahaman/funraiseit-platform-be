import {
  Account,
  accountStatus,
  Campaign,
  Payment,
  paymentStatus,
  paymentType,
  Payout,
  payoutSearchableFields,
  type IUser,
} from '@repo/db'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import { stripe } from '@app/libs/stripe'
import moment from 'moment'
import type { PipelineStage } from 'mongoose'
import type { TGetPayoutHistoriesForCampaign } from './payout.validations'

// ?? Overview api:
const getPayoutOverviewForCampaign = async (user: IUser, campaignId: string) => {
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

  // ?? Payout History :
  const payoutHistory = await Payout.aggregate([
    {
      $match: {
        campaign: campaign?._id,
      },
    },
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'payoutId',
        as: 'paymentDetails',
        pipeline: [
          {
            $match: {
              status: paymentStatus.PAID,
            },
          },
        ],
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
        _id: 0,
        payoutId: '$_id',
        campaignId: '$campaign',
        organizerId: '$organizer',
        stripeAccountId: '$stripeAccountId',
        stripePayoutId: '$stripePayoutId',
        paymentId: {
          $ifNull: ['$paymentDetails._id', null],
        },

        amount: '$amount',
        status: '$status',
        currency: '$currency',
        failureMessage: '$failedMessage',
        paidAt: {
          $ifNull: ['$paymentDetails.paidAt', null],
        },
        cancelledAt: {
          $ifNull: ['$cancelledAt', null],
        },
        failedAt: '$failedAt',
        createdAt: '$createdAt',
        updatedAt: '$createdAt',
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $limit: 3,
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
      available: availableUsd / 100,
      pending: pendingUsd / 100,
    },
    payoutHistory,
  }
}

// ?? Payout History:
const getPayoutHistoryForCampaignId = async (
  user: IUser,
  campaignId: string,
  query: TGetPayoutHistoriesForCampaign
) => {
  const {
    limit: currentLimit,
    page: currentPage,
    searchTerm,
    fromDate,
    toDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
    skipPagination,
  } = query

  const limit = Number(currentLimit) || 10
  const page = Number(currentPage) || 1
  const skip = (page - 1) * limit

  // ?? Check is campaign exists ?:
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, "Campaign doesn't exists.")
  }

  if (campaign?.organizer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, "This campaign doesn't belongs to your account.")
  }

  const pipeline: PipelineStage[] = [
    {
      $match: {
        campaign: campaign?._id,
      },
    },
  ]

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}

    if (fromDate) {
      dateFilter.$gte = moment(fromDate).startOf('day').toDate()
    }
    if (toDate) {
      dateFilter.$lte = moment(fromDate).endOf('day').toDate()
    }

    pipeline.push({
      $match: {
        createdAt: dateFilter,
      },
    })
  }

  if (status) {
    pipeline.push({
      $match: {
        status,
      },
    })
  }

  pipeline.push(
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'payoutId',
        as: 'paymentDetails',
        pipeline: [
          {
            $match: {
              status: paymentStatus.PAID,
            },
          },
        ],
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
        _id: 0,
        payoutId: '$_id',
        campaignId: '$campaign',
        organizerId: '$organizer',
        stripeAccountId: '$stripeAccountId',
        stripePayoutId: '$stripePayoutId',
        paymentId: {
          $ifNull: ['$paymentDetails._id', null],
        },

        amount: '$amount',
        status: '$status',
        currency: '$currency',
        failureMessage: '$failedMessage',
        paidAt: {
          $ifNull: ['$paymentDetails.paidAt', null],
        },
        cancelledAt: {
          $ifNull: ['$cancelledAt', null],
        },
        failedAt: '$failedAt',
        createdAt: '$createdAt',
        updatedAt: '$createdAt',
      },
    }
  )

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: payoutSearchableFields.map((field) => ({
          [field]: {
            $regex: field,
            $options: 'i',
          },
        })),
      },
    })
  }

  pipeline.push({
    $sort: {
      [sortBy]: sortOrder === 'desc' ? -1 : 1,
    },
  })

  const paginationPipeline: PipelineStage.FacetPipelineStage[] = []

  const isPaginationSkipped =
    skipPagination !== undefined &&
    ((typeof skipPagination === 'string' && skipPagination === 'true') || skipPagination === true)

  if (!isPaginationSkipped) {
    paginationPipeline.push(
      {
        $skip: skip,
      },
      {
        $limit: limit,
      }
    )
  }

  pipeline.push({
    $facet: {
      data: paginationPipeline,
      meta: [
        {
          $count: 'total',
        },
      ],
    },
  })

  // ?? Get Payout History
  const payoutHistory = await Payout.aggregate(pipeline)

  // ?? Calculation:
  const data = payoutHistory?.[0].data
  const total = payoutHistory?.[0]?.meta?.[0]?.total || 0
  const totalPages = Math.ceil(total / limit) || 0

  return {
    data,
    meta: {
      page: isPaginationSkipped ? 1 : page,
      limit: isPaginationSkipped ? total : limit,
      total: total,
      totalPages: isPaginationSkipped ? 1 : totalPages,
    },
  }
}

export const payoutServices = {
  getPayoutOverviewForCampaign,
  getPayoutHistoryForCampaignId,
}
