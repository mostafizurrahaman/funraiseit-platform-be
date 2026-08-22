import httpStatus from 'http-status'
import moment from 'moment'
import type { TGetAnalyticsOverview } from './analytics.validations'
import {
  BrandBuilder,
  brandBuilderStatus,
  Campaign,
  CampaignStatus,
  DonationPayment,
  OrderPayment,
  Payment,
  paymentStatus,
  paymentType,
} from 'packages/db/src'
import { AppError } from 'packages/shared/src'
import { formatRelativeTime } from '@app/libs/format-relative-time'
import { formatPaymentSummary, formatRevenueGraph } from './analytics.utils'

const getCampaignAnalyticsFromDB = async (query: TGetAnalyticsOverview) => {
  const { campaignId } = query

  // ?? Campaign
  const campaign = await Campaign.findOne({
    _id: campaignId,
  })
  if (!campaign) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Campaign not found!')
  }

  // ?? Raised Amount
  const raisedAmount = campaign?.raisedAmount ?? 0
  const goalAmount = campaign?.goalAmount ?? 0
  const remainingBalance = goalAmount - raisedAmount
  const raisedPercentage = Math.floor((raisedAmount * 100) / goalAmount)

  //  ?? Remaining days :
  let remainingDays = 0
  if (campaign?.status === CampaignStatus.COMPLETED) {
    remainingDays = 0
  } else {
    //  ?? Start date:
    const endDate = moment(campaign.endDate)
    const now = moment()
    remainingDays = Math.max(0, endDate.diff(now, 'days'))
  }

  const supporters = await Payment.aggregate([
    {
      $match: {
        campaign: campaign?._id,
        status: paymentStatus.PAID,
        paymentType: {
          $in: [paymentType.DONATION, paymentType.ORDER],
        },
      },
    },
    {
      $group: {
        _id: '$supporter',
      },
    },
    {
      $count: 'totalSupporters',
    },
  ])

  const totalCalculations = await Payment.aggregate([
    {
      $match: {
        campaign: campaign?._id,
        status: paymentStatus.PAID,
        paymentType: {
          $in: [paymentType.DONATION, paymentType.ORDER],
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
        paymentId: '6a6af4435366f1fe89efc79c',
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
        subTotal: {
          $sum: '$subtotal',
        },
        shippingFee: {
          $sum: '$shippingFee',
        },
        totalAmount: {
          $sum: '$totalAmount',
        },
        stripeFee: {
          $sum: '$stripeFee',
        },
        platformFee: {
          $sum: '$platformFee',
        },
        organizerAmount: {
          $sum: '$organizerAmount',
        },
        organizerAmountWithoutShipping: {
          $sum: '$organizerAmountWithoutShipping',
        },
      },
    },
  ])

  const orders = await OrderPayment.aggregate([
    {
      $match: {
        campaign: campaign?._id,
        status: paymentStatus.PAID,
      },
    },
    {
      $count: 'totalOrders',
    },
  ])

  const donations = await DonationPayment.aggregate([
    {
      $match: {
        campaign: campaign?._id,
        status: paymentStatus.PAID,
      },
    },
    {
      $count: 'totalDonations',
    },
  ])

  const recentActivity = await Payment.aggregate([
    {
      $match: {
        campaign: campaign?._id,
        status: paymentStatus.PAID,
        paymentType: {
          $in: [paymentType.DONATION, paymentType.ORDER],
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: 'supporters',
        localField: 'supporter',
        foreignField: '_id',
        as: 'supporterDetails',
      },
    },

    {
      $unwind: {
        path: '$supporterDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        paymentId: '$_id',
        name: '$supporterDetails.name',
        isDonation: {
          $cond: [{ $ifNull: ['$donation', false] }, true, false],
        },
        amount: 1,
        paidAt: 1,
      },
    },
  ])

  const recentDonation = await Payment.aggregate([
    {
      $match: {
        campaign: campaign?._id,
        status: paymentStatus.PAID,
        paymentType: {
          $in: [paymentType.DONATION],
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: 'supporters',
        localField: 'supporter',
        foreignField: '_id',
        as: 'supporterDetails',
      },
    },

    {
      $unwind: {
        path: '$supporterDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        paymentId: '$_id',
        donationId: '$donation',
        name: '$supporterDetails.name',
        amount: 1,
        paidAt: 1,
      },
    },
  ])

  const recentOrders = await Payment.aggregate([
    {
      $match: {
        campaign: campaign?._id,
        status: paymentStatus.PAID,
        paymentType: {
          $in: [paymentType.ORDER],
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: 'supporters',
        localField: 'supporter',
        foreignField: '_id',
        as: 'supporterDetails',
      },
    },

    {
      $unwind: {
        path: '$supporterDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        paymentId: '$_id',
        orderId: '$order',
        name: '$supporterDetails.name',
        amount: 1,
        paidAt: 1,
      },
    },
  ])

  return {
    campaignId: campaign?._id,
    campaignCode: campaign?.campaignCode,
    campaignStatus: campaign.status,
    campaignEnds: campaign.endDate,
    expectedPayoutDate: campaign?.expectedPayoutDate ?? null,
    raisedAmount,
    goalAmount,
    remainingBalance,
    raisedPercentage,
    remainingDays,
    supporters: supporters?.[0]?.totalSupporters || 0,
    orders: orders?.[0]?.totalOrders ?? 0,
    donations: donations?.[0]?.totalDonations ?? 0,
    recentActivities: recentActivity.map((item) => ({
      ...item,
      paidAt: formatRelativeTime(item.paidAt),
    })),
    recentDonations: recentDonation.map((item) => ({
      ...item,
      paidAt: formatRelativeTime(item.paidAt),
    })),
    recentOrders: recentOrders.map((item) => ({
      ...item,
      paidAt: formatRelativeTime(item.paidAt),
    })),
    financialBreakdown: totalCalculations?.[0] ?? {
      _id: null,
      subTotal: 0,
      shippingFee: 0,
      totalAmount: 0,
      stripeFee: 0,
      platformFee: 0,
      organizerAmount: 0,
      organizerAmountWithoutShipping: 0,
    },
  }
}

const getAnalyticsForAdminPortal = async () => {
  const endDate = moment().endOf('day')?.toDate()
  const startDate = moment().utc().subtract(6, 'days').startOf('day').toDate()
  const [campaignStats, payments, revenueGraph, topCampaigns, recentBrandBuilders] =
    await Promise.all([
      await Campaign.aggregate([
        {
          $group: {
            _id: null,
            liveCampaign: {
              $sum: {
                $cond: [{ $eq: ['$status', CampaignStatus.ACTIVE] }, 1, 0],
              },
            },
            completedCampaign: {
              $sum: {
                $cond: [{ $eq: ['$status', CampaignStatus.COMPLETED] }, 1, 0],
              },
            },
            payoutRequestedCampaign: {
              $sum: {
                $cond: [{ $eq: ['$status', CampaignStatus.PAYOUT_REQUEST] }, 1, 0],
              },
            },
            paidOutCampaign: {
              $sum: {
                $cond: [{ $eq: ['$status', CampaignStatus.PAID_OUT] }, 1, 0],
              },
            },
            cancelledCampaign: {
              $sum: {
                $cond: [{ $eq: ['$status', CampaignStatus.CANCELLED] }, 1, 0],
              },
            },
            rejectedCampaign: {
              $sum: {
                $cond: [{ $eq: ['$status', CampaignStatus.REJECTED] }, 1, 0],
              },
            },
            totalCampaign: {
              $sum: 1,
            },
          },
        },
      ]),
      await Payment.aggregate([
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
                      { $eq: ['$status', paymentStatus.PAID] },
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
                      { $eq: ['$status', paymentStatus.PAID] },
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
                      { $eq: ['$status', paymentStatus.PAID] },
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
                      { $eq: ['$status', paymentStatus.PAID] },
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
                      { $eq: ['$status', paymentStatus.PAID] },
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
                      { $eq: ['$status', paymentStatus.PAID] },
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
                      { $eq: ['$status', paymentStatus.FAILED] },
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
                      { $eq: ['$status', paymentStatus.FAILED] },
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
                      { $eq: ['$status', paymentStatus.FAILED] },
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
                      { $eq: ['$status', paymentStatus.FAILED] },
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
                      { $eq: ['$status', paymentStatus.FAILED] },
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
      ]),
      await Payment.aggregate([
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
            paidAt: {
              $gte: startDate,
              $lte: endDate,
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
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },

            // Transaction/platform fees from orders + donations
            transactionFees: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $in: ['$paymentType', [paymentType.DONATION, paymentType.ORDER]],
                      },
                      {
                        $eq: ['$status', paymentStatus.PAID],
                      },
                    ],
                  },
                  {
                    $ifNull: ['$paymentBreakdown.platformFee', 0],
                  },
                  0,
                ],
              },
            },

            // Brand Builder revenue
            brandBuilderRevenue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$paymentType', paymentType.BRAND_BUILDER],
                      },
                      {
                        $eq: ['$status', paymentStatus.PAID],
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

            // Launch fee revenue
            launchFeeRevenue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$paymentType', paymentType.LAUNCH_FEE],
                      },
                      {
                        $eq: ['$status', paymentStatus.PAID],
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
          },
        },

        {
          $addFields: {
            platformRevenue: {
              $add: ['$transactionFees', '$brandBuilderRevenue', '$launchFeeRevenue'],
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },

        {
          $project: {
            _id: 0,
            date: '$_id',
            revenue: '$platformRevenue',
            platformFees: '$transactionFees',
            brandBuilderRevenue: 1,
            launchFeeRevenue: 1,
          },
        },
      ]),
      await Campaign.aggregate([
        {
          $match: {
            status: {
              $in: [
                CampaignStatus.ACTIVE,
                CampaignStatus.COMPLETED,
                CampaignStatus.PAID_OUT,
                CampaignStatus.PAYOUT_REQUEST,
              ],
            },
          },
        },
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
            from: 'payments',
            localField: '_id',
            foreignField: 'campaign',
            as: 'paymentDetails',
            pipeline: [
              {
                $match: {
                  status: paymentStatus.PAID,
                  paymentType: {
                    $in: [paymentType.DONATION, paymentType.ORDER],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  totalOrders: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ['$paymentType', paymentType.ORDER],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  totalDonations: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ['$paymentType', paymentType.DONATION],
                        },
                        1,
                        0,
                      ],
                    },
                  },
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
          $unwind: {
            path: '$organizerDetails',
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            _id: 0,
            campaignId: '$_id',
            name: 1,
            raisedAmount: 1,
            thumbnail: {
              $ifNull: ['$thumbnail', null],
            },
            organizerId: '$organizerDetails._id',
            organizerName: '$organizerDetails.name',
            organizerEmail: '$organizerDetails.email',
            organizerPhone: { $ifNull: ['$organizerDetails.phoneNumber', null] },
            totalOrders: {
              $ifNull: ['$paymentDetails.totalOrders', 0],
            },
            totalDonations: {
              $ifNull: ['$paymentDetails.totalDonations', 0],
            },
            campaignStatus: '$status',
          },
        },
        {
          $sort: {
            raisedAmount: -1,
          },
        },
        {
          $limit: 6,
        },
      ]),
      await BrandBuilder.aggregate([
        {
          $match: {
            status: {
              $ne: brandBuilderStatus.PAYMEMT_FAILED,
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'organizer',
            foreignField: '_id',
            as: 'organizerDetails',
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
            _id: 0,
            brandId: '$_id',
            businessName: '$businessName',
            brandImage: { $ifNull: ['$brandImage', null] },
            brandLogo: { $ifNull: ['$brandLogo', null] },
            sellingItem: { $ifNull: ['$sellingItem', []] },
            status: '$status',
            organizerId: '$organizerDetails._id',
            organizerName: '$organizerDetails.name',
            organizerEmail: '$organizerDetails.email',
            organizerPhone: { $ifNull: ['$organizerDetails.phoneNumber', null] },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $limit: 6,
        },
      ]),
    ])

  // ?? Campaign :
  const campaignBreakdown = campaignStats?.[0] ?? {}

  return {
    liveCampaign: campaignBreakdown.liveCampaign ?? 0,
    completedCampaign: campaignBreakdown.completedCampaign ?? 0,
    payoutRequestedCampaign: campaignBreakdown.payoutRequestedCampaign ?? 0,
    paidOutCampaign: campaignBreakdown.paidOutCampaign ?? 0,
    cancelledCampaign: campaignBreakdown.cancelledCampaign ?? 0,
    rejectedCampaign: campaignBreakdown.rejectedCampaign ?? 0,
    totalCampaign: campaignBreakdown.totalCampaign ?? 0,
    ...formatPaymentSummary(payments?.[0]),
    revenueGraph: formatRevenueGraph(revenueGraph, startDate, endDate),
    topCampaigns,
    recentBrandBuilders,
  }
}

export const analyticServices = { getCampaignAnalyticsFromDB, getAnalyticsForAdminPortal }
