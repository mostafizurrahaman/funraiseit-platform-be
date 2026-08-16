import { Payment, paymentSearchableFields, paymentStatus, paymentType } from '@repo/db'
import { Types, type PipelineStage } from 'mongoose'

import type { TGetAllPaymentQueryParamsType } from './payment.validations'
import { formatPaymentSummary } from '../analytics/analytics.utils'

const getAllPayment = async (query: TGetAllPaymentQueryParamsType) => {
  const {
    page: currentPage = 1,
    limit: currentLimit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'paidAt',
    fromDate,
    toDate,
    campaignId,
    organizerId,
    paymentStatus,
    paymentType,
  } = query

  const page = Number(currentPage) || 1
  const limit = Number(currentLimit) || 10

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (campaignId) {
    pipeline.push({
      $match: {
        campaign: new Types.ObjectId(campaignId),
      },
    })
  }

  if (organizerId) {
    pipeline.push({
      $match: {
        organizer: new Types.ObjectId(campaignId),
      },
    })
  }

  if (paymentStatus) {
    pipeline.push({
      $match: {
        status: paymentStatus,
      },
    })
  }
  if (paymentType) {
    pipeline.push({
      $match: {
        paymentType,
      },
    })
  }

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'organizer',
        foreignField: '_id',
        as: 'organizerDetails',
      },
    },
    {
      $lookup: {
        from: 'paymentbreakdowns',
        localField: '_id',
        foreignField: 'payment',
        as: 'paymentBreakdown',
      },
    },

    {
      $unwind: {
        path: '$paymentBreakdown',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$organizerDetails',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        paymentId: '$_id',
        transactionId: '$stripeBalanceTransactionId',
        organizerId: '$organizerDetails._id',
        organizerName: '$organizerDetails.name',
        organizerEmail: '$organizerDetails.email',
        organizerPhone: { $ifNull: ['$organizerDetails.phoneNumber', null] },
        organizerProfileImage: { $ifNull: ['$organizerDetails.profileImage', null] },

        campaignId: '$campaign',
        brandBuilderId: { $ifNull: ['$brandBuilderId', null] },
        orderId: { $ifNull: ['$order', null] },
        donationId: { $ifNull: ['$donation', null] },
        payoutId: { $ifNull: ['$payoutId', null] },
        paymentType: '$paymentType',

        paymentBreakdownId: { $ifNull: ['$paymentBreakdown._id', null] },
        subtotal: { $ifNull: ['$paymentBreakdown.subtotal', 0] },
        shippingFee: { $ifNull: ['$paymentBreakdown.shippingFee', 0] },
        totalAmount: { $ifNull: ['$paymentBreakdown.totalAmount', 0] },
        stripeFee: { $ifNull: ['$paymentBreakdown.stripeFee', 0] },
        platformFee: { $ifNull: ['$paymentBreakdown.platformFee', 0] },
        organizerAmount: { $ifNull: ['$paymentBreakdown.organizerAmount', 0] },
        organizerAmountWithoutShipping: {
          $ifNull: ['$paymentBreakdown.organizerAmountWithoutShipping', 0],
        },
        discountAmount: { $ifNull: ['$paymentBreakdown.discountAmount', 0] },
        status: '$status',

        paidAt: '$paidAt',
        createdAt: '$createdAt',
        updatedAt: '$updatedAt',
      },
    }
  )

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: paymentSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await Payment.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

const getPaymentOverview = async () => {
  const [payments] = await Payment.aggregate([
    {
      $match: {
        paymentType: {
          $in: [
            paymentType.ORDER,
            paymentType.DONATION,
            paymentType.BRAND_BUILDER,
            paymentType.LAUNCH_FEE,
          ],
        },
      },
    },
    {
      $lookup: {
        from: 'paymentbreakdowns',
        localField: '_id',
        foreignField: 'payment',
        as: 'paymentBreakdown',
      },
    },
    {
      $unwind: {
        path: '$paymentBreakdown',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: null,
        transactionFees: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ['$paymentType', [paymentType.DONATION, paymentType.ORDER]] },
                  { status: paymentStatus.PAID },
                ],
              },

              {
                $ifNull: ['$paymentBreakdown.platformFee', 0],
              },
              0,
            ],
          },
        },
        brandBuilderTotal: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$paymentType', paymentType.BRAND_BUILDER],
                  },
                  {
                    status: paymentStatus.PAID,
                  },
                ],
              },
              {
                $ifNull: ['$paymentBreakdown.subtotal', 0],
              },
              0,
            ],
          },
        },
        brandBuilderTotalExcludingStripeFee: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$paymentType', paymentType.BRAND_BUILDER],
                  },
                  {
                    status: paymentStatus.PAID,
                  },
                ],
              },
              {
                $ifNull: ['$paymentBreakdown.totalAmount', 0],
              },
              0,
            ],
          },
        },
        brandBuilderStripeFee: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$paymentType', paymentType.BRAND_BUILDER],
                  },
                  {
                    status: paymentStatus.PAID,
                  },
                ],
              },
              {
                $ifNull: ['$paymentBreakdown.stripeFee', 0],
              },
              0,
            ],
          },
        },
        launchFeeCollectedTotal: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$paymentType', paymentType.LAUNCH_FEE],
                  },
                  {
                    status: paymentStatus.PAID,
                  },
                ],
              },
              {
                $ifNull: ['$paymentBreakdown.subtotal', 0],
              },
              0,
            ],
          },
        },
        launchFeeCollectedExcludingAllFees: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$paymentType', paymentType.LAUNCH_FEE],
                  },
                  {
                    status: paymentStatus.PAID,
                  },
                ],
              },
              {
                $ifNull: ['$paymentBreakdown.totalAmount', 0],
              },
              0,
            ],
          },
        },
        failedOrderPayments: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$paymentType', paymentType.ORDER],
                  },
                  {
                    status: paymentStatus.FAILED,
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        failedDonationPayments: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$paymentType', paymentType.DONATION],
                  },
                  {
                    status: paymentStatus.FAILED,
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        failedBrandBuilderPayments: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$paymentType', paymentType.BRAND_BUILDER],
                  },
                  {
                    status: paymentStatus.FAILED,
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        failedCampaignLaunchPayments: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$paymentType', paymentType.LAUNCH_FEE],
                  },
                  {
                    status: paymentStatus.FAILED,
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalFailedPayments: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $ne: ['$paymentType', paymentType.PAYOUT],
                  },
                  {
                    status: paymentStatus.FAILED,
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $addFields: {
        totalPlatformRevenue: {
          $add: [
            '$launchFeeCollectedExcludingAllFees',
            '$brandBuilderTotalExcludingStripeFee',
            '$transactionFees',
          ],
        },
        brandBuilderRevenue: '$brandBuilderTotalExcludingStripeFee',

        campaignLaunchRevenue: '$launchFeeCollectedExcludingAllFees',
        transactionFeeRevenue: '$transactionFees',
      },
    },
    {
      $addFields: {
        brandBuilderRevenuePercentage: {
          $divide: [{ $multiply: ['$brandBuilderRevenue', 100] }, '$totalPlatformRevenue'],
        },
        campaignLaunchRevenuePercentage: {
          $divide: [{ $multiply: ['$campaignLaunchRevenue', 100] }, '$totalPlatformRevenue'],
        },
        transactionFeeRevenuePercentage: {
          $divide: [{ $multiply: ['$transactionFeeRevenue', 100] }, '$totalPlatformRevenue'],
        },
      },
    },
  ])

  const formattedPaymentBreakdowns = formatPaymentSummary(payments)

  return formattedPaymentBreakdowns
}

export const paymentServices = {
  getAllPayment,
  getPaymentOverview,
}
