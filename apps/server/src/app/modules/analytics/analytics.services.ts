import httpStatus from 'http-status'
import moment from 'moment'
import type { TGetAnalyticsOverview } from './analytics.validations'
import {
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

export const analyticServices = { getCampaignAnalyticsFromDB }
