import {
  Campaign,
  CampaignStatus,
  DonationPayment,
  OrderPayment,
  Payment,
  paymentStatus,
  paymentType,
  Supporter,
  supporterSearchableFields,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import { Types, type PipelineStage } from 'mongoose'

import type {
  TGetAllSupporterQueryParamsType,
  TSendEmailToSupporterPayload,
} from './supporter.validations'
import { renderEmail, SupporterUpdateEmail } from 'packages/email-templates/src'
import { sendEmail } from 'packages/email-sender/src'
import configs from '@app/configs'

const getAllSupporter = async (user: IUser, query: TGetAllSupporterQueryParamsType) => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    campaignId,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
  } = query

  // ?? Check is campaign exists? "
  const campaign = await Campaign.findOne({
    _id: campaignId,
    organizer: user?._id,
  })
  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found!')
  }

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  pipeline.push(
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'supporter',
        as: 'paymentDetails',
        pipeline: [
          {
            $match: {
              status: paymentStatus.PAID,
            },
          },
          {
            $lookup: {
              from: 'paymentbreakdowns',
              localField: '_id',
              foreignField: 'payment',
              as: 'paymentBreakDown',
            },
          },

          {
            $unwind: {
              path: '$paymentBreakDown',
              preserveNullAndEmptyArrays: true,
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
    }
  )

  pipeline.push({
    $project: {
      name: '$name',
      email: '$email',
      phone: '$email',
      campaignId: '$paymentDetails.campaign',
      paymentDetails: 1,
      paidAt: '$paymentDetails.paidAt',
      createdAt: '$createdAt',
      updatedAt: '$updatedAt',
    },
  })

  pipeline.push({
    $match: {
      campaignId: new Types.ObjectId(campaignId),
    },
  })

  pipeline.push({
    $sort: {
      paidAt: -1,
    },
  })

  pipeline.push({
    $group: {
      _id: '$_id',
      campaignId: {
        $first: '$campaignId',
      },
      name: {
        $first: '$name',
      },
      email: {
        $first: '$email',
      },
      phone: {
        $first: '$phoneNumber',
      },

      // ?? Calculations Break downs:
      subTotal: {
        $sum: '$paymentDetails.paymentBreakDown.subtotal',
      },
      shippingFee: {
        $sum: '$paymentDetails.paymentBreakDown.shippingFee',
      },
      totalAmount: {
        $sum: '$paymentDetails.paymentBreakDown.totalAmount',
      },
      stripeFee: {
        $sum: '$paymentDetails.paymentBreakDown.stripeFee',
      },
      platformFee: {
        $sum: '$paymentDetails.paymentBreakDown.platformFee',
      },
      organizerAmount: {
        $sum: '$paymentDetails.paymentBreakDown.organizerAmount',
      },
      organizerAmountWithoutShipping: {
        $sum: '$paymentDetails.paymentBreakDown.organizerAmountWithoutShipping',
      },
      discountAmount: {
        $sum: '$paymentDetails.paymentBreakDown.discountAmount',
      },

      totalOrders: {
        $sum: {
          $cond: [
            {
              $eq: ['$paymentDetails.paymentType', 'order'],
            },
            '$paymentDetails.paymentBreakDown.totalAmount',
            0,
          ],
        },
      },

      totalDonations: {
        $sum: {
          $cond: [
            {
              $eq: ['$paymentDetails.paymentType', 'donation'],
            },
            '$paymentDetails.paymentBreakDown.totalAmount',
            0,
          ],
        },
      },
      lastActivity: {
        $first: '$paidAt',
      },
      createdAt: {
        $first: '$createdAt',
      },
      updatedAt: {
        $first: '$updatedAt',
      },
    },
  })

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: supporterSearchableFields.map((field: string) => ({
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

  const aggregated = await Supporter.aggregate(pipeline)

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

const getSupporterOverviewByCampaignId = async (user: IUser, campaignId: string) => {
  // ?? Check if campaign exists
  const campaign = await Campaign.findOne({
    _id: campaignId,
    organizer: user?._id,
  })
  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found!')
  }

  // Convert campaignId to ObjectId for aggregation
  const campaignObjectId = new Types.ObjectId(campaignId)

  // Calculate 7 days ago for "New This Week"
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0) // Start of the day 7 days ago

  const [
    totalSupportersResult,
    orderStatsResult,
    donationStatsResult,
    supportOverviewResult,
    topSupportersResult,
    newSupportersThisWeekResult,
    mostActiveDayResult,
    peakEngagementTimeResult,
    repeatSupportersResult,
  ] = await Promise.all([
    // 1. Total Supporters (unique individuals who made any PAID payment for this campaign)
    Payment.aggregate([
      {
        $match: {
          campaign: campaignObjectId,
          status: paymentStatus.PAID,
          paymentType: { $in: [paymentType.DONATION, paymentType.ORDER] },
        },
      },
      {
        $group: {
          _id: '$supporter', // Group by supporter to get unique IDs
        },
      },
      {
        $count: 'total', // Count the unique supporters
      },
    ]),

    // 2. Total Orders Stats (Amount, Count, Average, Supporters Count)
    OrderPayment.aggregate([
      {
        $match: {
          campaign: campaignObjectId,
          status: paymentStatus.PAID,
          paymentType: paymentType.ORDER,
        },
      },
      {
        $group: {
          _id: null, // Group all orders together
          totalOrdersAmount: { $sum: '$amount' }, // Sum of all order amounts
          totalIndividualOrders: { $sum: 1 }, // Count of individual order payments
          uniqueSupporters: { $addToSet: '$supporter' }, // Collect unique supporter IDs
        },
      },
      {
        $project: {
          _id: 0,
          totalOrdersAmount: 1,
          totalIndividualOrders: 1,
          totalSupportersWithOrders: { $size: '$uniqueSupporters' }, // Count unique supporters who made orders
          averageOrderValue: {
            $cond: [
              { $eq: ['$totalIndividualOrders', 0] },
              0,
              { $divide: ['$totalOrdersAmount', '$totalIndividualOrders'] },
            ],
          },
        },
      },
    ]),

    // 3. Total Donations Stats (Amount, Count, Average, Supporters Count)
    DonationPayment.aggregate([
      {
        $match: {
          campaign: campaignObjectId,
          status: paymentStatus.PAID,
          paymentType: paymentType.DONATION,
        },
      },
      {
        $group: {
          _id: null, // Group all donations together
          totalDonationsAmount: { $sum: '$amount' }, // Sum of all donation amounts
          totalIndividualDonations: { $sum: 1 }, // Count of individual donation payments
          uniqueSupporters: { $addToSet: '$supporter' }, // Collect unique supporter IDs
        },
      },
      {
        $project: {
          _id: 0,
          totalDonationsAmount: 1,
          totalIndividualDonations: 1,
          totalSupportersWithDonations: { $size: '$uniqueSupporters' }, // Count unique supporters who made donations
          averageDonationValue: {
            $cond: [
              { $eq: ['$totalIndividualDonations', 0] },
              0,
              { $divide: ['$totalDonationsAmount', '$totalIndividualDonations'] },
            ],
          },
        },
      },
    ]),

    // 4. Support Overview (Orders Only, Donations Only, Both Orders & Donations)
    Payment.aggregate([
      {
        $match: {
          campaign: campaignObjectId,
          status: paymentStatus.PAID,
          paymentType: { $in: [paymentType.DONATION, paymentType.ORDER] },
        },
      },
      {
        $group: {
          _id: '$supporter', // Group by each unique supporter
          paymentTypes: { $addToSet: '$paymentType' }, // Collect all payment types for this supporter
        },
      },
      {
        $project: {
          _id: 0,
          isOrderOnly: {
            $and: [
              { $in: [paymentType.ORDER, '$paymentTypes'] }, // Has made an order
              { $not: { $in: [paymentType.DONATION, '$paymentTypes'] } }, // Has NOT made a donation
            ],
          },
          isDonationOnly: {
            $and: [
              { $in: [paymentType.DONATION, '$paymentTypes'] }, // Has made a donation
              { $not: { $in: [paymentType.ORDER, '$paymentTypes'] } }, // Has NOT made an order
            ],
          },
          isBoth: {
            $and: [
              { $in: [paymentType.ORDER, '$paymentTypes'] }, // Has made an order
              { $in: [paymentType.DONATION, '$paymentTypes'] }, // Has made a donation
            ],
          },
        },
      },
      {
        $group: {
          _id: null, // Group all results to count categories
          ordersOnly: { $sum: { $cond: ['$isOrderOnly', 1, 0] } },
          donationsOnly: { $sum: { $cond: ['$isDonationOnly', 1, 0] } },
          bothOrdersAndDonations: { $sum: { $cond: ['$isBoth', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          ordersOnly: 1,
          donationsOnly: 1,
          bothOrdersAndDonations: 1,
        },
      },
    ]),

    // 5. Top Supporters (by total amount contributed to this campaign)
    Payment.aggregate([
      {
        $match: {
          campaign: campaignObjectId,
          status: paymentStatus.PAID,
          paymentType: { $in: [paymentType.DONATION, paymentType.ORDER] },
        },
      },
      {
        $group: {
          _id: '$supporter', // Group by each unique supporter
          totalAmount: { $sum: '$amount' }, // Sum their total contributions
        },
      },
      {
        $lookup: {
          from: 'supporters', // Join with the supporters collection
          localField: '_id',
          foreignField: '_id',
          as: 'supporterDetails',
        },
      },
      {
        $unwind: {
          path: '$supporterDetails',
          preserveNullAndEmptyArrays: true, // Keep supporters even if their details are missing
        },
      },
      {
        $project: {
          _id: 0,
          supporterId: '$_id',
          supporterName: { $ifNull: ['$supporterDetails.name', 'Unknown Supporter'] }, // Use name from supporterDetails or 'Unknown Supporter'
          totalAmount: 1,
        },
      },
      {
        $sort: { totalAmount: -1 }, // Sort by amount in descending order
      },
      {
        $limit: 5, // Get the top 5
      },
    ]),

    // 6. New This Week (Supporters whose *Supporter* document was created in the last 7 days AND made a payment to this campaign)
    Payment.aggregate([
      {
        $match: {
          campaign: campaignObjectId,
          status: paymentStatus.PAID,
          paymentType: { $in: [paymentType.DONATION, paymentType.ORDER] },
        },
      },
      {
        $group: {
          _id: '$supporter', // Get unique supporters who made payments to this campaign
        },
      },
      {
        $lookup: {
          from: 'supporters',
          localField: '_id',
          foreignField: '_id',
          as: 'supporterDetails',
        },
      },
      {
        $unwind: '$supporterDetails',
      },
      {
        $match: {
          'supporterDetails.createdAt': { $gte: sevenDaysAgo }, // Filter for supporters created within the last 7 days
        },
      },
      {
        $count: 'newSupportersCount',
      },
    ]),

    // 7. Most Active Day (Day of the week with the most unique supporters making payments)
    Payment.aggregate([
      {
        $match: {
          campaign: campaignObjectId,
          status: paymentStatus.PAID,
          paidAt: { $exists: true, $ne: null }, // Ensure payment has a paidAt timestamp
          paymentType: { $in: [paymentType.DONATION, paymentType.ORDER] },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$paidAt' }, // Extract day of week (1=Sunday, 7=Saturday)
          totalSupporters: { $addToSet: '$supporter' }, // Count unique supporters for each day
        },
      },
      {
        $project: {
          _id: 0,
          dayOfWeekNum: '$_id',
          supporterCount: { $size: '$totalSupporters' },
        },
      },
      {
        $sort: { supporterCount: -1 }, // Sort by supporter count descending
      },
      {
        $limit: 1, // Get the day with the highest count
      },
    ]),

    // 8. Most Active Time (Count of unique supporters with payments between 10 AM and 2 PM, inclusive)
    Payment.aggregate([
      {
        $match: {
          campaign: campaignObjectId,
          status: paymentStatus.PAID,
          paidAt: { $exists: true, $ne: null },
          paymentType: { $in: [paymentType.DONATION, paymentType.ORDER] },
          $expr: {
            $and: [
              { $gte: [{ $hour: '$paidAt' }, 10] }, // Hour 10 (10 AM)
              { $lte: [{ $hour: '$paidAt' }, 14] }, // Hour 14 (2 PM), so includes 10, 11, 12, 13, 14
            ],
          },
        },
      },
      {
        $group: {
          _id: null, // Group all matching payments
          totalSupportersInPeakHours: { $addToSet: '$supporter' }, // Count unique supporters in this time range
        },
      },
      {
        $project: {
          _id: 0,
          peakHourSupporterCount: { $size: '$totalSupportersInPeakHours' },
        },
      },
    ]),

    // 9. Repeat Supporters (unique individuals who made more than one PAID payment for this campaign)
    Payment.aggregate([
      {
        $match: {
          campaign: campaignObjectId,
          status: paymentStatus.PAID,
          paymentType: { $in: [paymentType.DONATION, paymentType.ORDER] },
        },
      },
      {
        $group: {
          _id: '$supporter', // Group by each unique supporter
          paymentCount: { $sum: 1 }, // Count how many payments each supporter made
        },
      },
      {
        $match: {
          paymentCount: { $gt: 1 }, // Filter for supporters who made more than one payment
        },
      },
      {
        $count: 'repeatSupportersCount', // Count these repeat supporters
      },
    ]),
  ])

  // Extract results and provide default values if aggregation returns empty arrays
  const totalSupporters = totalSupportersResult[0]?.total || 0

  const ordersData = orderStatsResult[0] || {
    totalOrdersAmount: 0,
    totalIndividualOrders: 0,
    totalSupportersWithOrders: 0,
    averageOrderValue: 0,
  }

  const donationsData = donationStatsResult[0] || {
    totalDonationsAmount: 0,
    totalIndividualDonations: 0,
    totalSupportersWithDonations: 0,
    averageDonationValue: 0,
  }

  const supportOverviewData = supportOverviewResult[0] || {
    ordersOnly: 0,
    donationsOnly: 0,
    bothOrdersAndDonations: 0,
  }

  const topSupporters = topSupportersResult || []

  const newSupportersThisWeek = newSupportersThisWeekResult[0]?.newSupportersCount || 0

  const mostActiveDay = mostActiveDayResult[0] || { dayOfWeekNum: null, supporterCount: 0 }
  // Map day of week number to name (1=Sunday, 7=Saturday)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const mostActiveDayName = mostActiveDay.dayOfWeekNum
    ? dayNames[mostActiveDay.dayOfWeekNum - 1]
    : null

  const peakEngagementTimeCount = peakEngagementTimeResult[0]?.peakHourSupporterCount || 0

  const repeatSupportersCount = repeatSupportersResult[0]?.repeatSupportersCount || 0

  return {
    totalSupporters, // Total Supporters: 138 People
    totalOrders: {
      amount: ordersData.totalOrdersAmount, // Total Orders: $1,850
      fromSupporters: ordersData.totalSupportersWithOrders, // From 67 supporters (unique)
      totalOrdersCount: ordersData.totalIndividualOrders, // Total number of individual orders
    },
    totalDonations: {
      amount: donationsData.totalDonationsAmount, // Total Donations: $600
      fromSupporters: donationsData.totalSupportersWithDonations, // From 71 supporters (unique)
      totalDonationsCount: donationsData.totalIndividualDonations, // Total number of individual donations
    },
    totalSupport: {
      amount: ordersData.totalOrdersAmount + donationsData.totalDonationsAmount, // Total Support: $2,450
    },
    newSupportersThisWeek, // New This Week: 24 new supporters
    supportOverview: {
      ordersOnly: supportOverviewData.ordersOnly, // Orders Only: 67 (49%)
      donationsOnly: supportOverviewData.donationsOnly, // Donations Only: 71 (51%)
      bothOrdersAndDonations: supportOverviewData.bothOrdersAndDonations, // Both Orders & Donations: 32 (23%)
    },
    topSupporters, // Top Supporters: List of 5
    mostActiveDay: {
      day: mostActiveDayName, // Most Active Day: Saturday
      supporterCount: mostActiveDay.supporterCount, // 28 supporters
    },
    mostActiveTimeRange: {
      range: '10AM-2PM', // Most Active Day: 10AM-2PM
      peakEngagementCount: peakEngagementTimeCount, // Peak engagement
    },
    repeatSupporters: repeatSupportersCount, // Repeat Supporters: 18 Supported more than once
    averageOrderValue: ordersData.averageOrderValue, // Average Order Value: $27.61 From 67 orders
    averageDonationValue: donationsData.averageDonationValue, // Average Donations: $18.75 From 71 orders
  }
}

const sendEmailToCampaignSupporters = async (
  user: IUser,
  payload: TSendEmailToSupporterPayload
) => {
  const { campaignId, subject, message } = payload

  const campaign = await Campaign.findOne({
    _id: campaignId,
    organizer: user?._id,
  })

  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found!')
  }

  if (campaign?.organizer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.NOT_FOUND, `This campaign doesn't belong to your organization.`)
  }

  if (
    [
      CampaignStatus.DRAFT,
      CampaignStatus.PENDING,
      CampaignStatus.CANCELLED,
      CampaignStatus.REJECTED,
    ].includes(campaign.status as 'draft' | 'pending' | 'rejected' | 'cancelled')
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You cannot send a message when the campaign status is ${campaign.status}`
    )
  }

  // Filter all the supporters email for this campaign:
  const supporters = await Payment.aggregate([
    {
      $match: {
        campaign: campaign?._id,
        status: paymentStatus.PAID,
        paymentType: { $in: [paymentType.DONATION, paymentType.ORDER] },
      },
    },
    {
      $group: {
        _id: null,
        supporters: {
          $addToSet: '$supporter',
        },
      },
    },
    {
      $lookup: {
        from: 'supporters',
        localField: 'supporters',
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
        supporterId: '$supporterDetails._id',
        supporterName: '$supporterDetails.name',
        supporterEmail: '$supporterDetails.email',
        supporterPhone: '$supporterDetails.phoneNumber',
      },
    },
  ])

  if (!supporters || supporters.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'No supporters found for this campaign.')
  }

  // Generate and send emails concurrently
  const emailPromises = supporters.map(async (supporter) => {
    if (!supporter.supporterEmail) return

    // 1. Render the React Component into an HTML string
    const emailHtml = await renderEmail(
      SupporterUpdateEmail({
        supporterName: supporter.supporterName || 'Awesome Supporter',
        campaignTitle: campaign.name || 'Campaign Update',
        message: message,
        logoUrl: configs.site.logo!,
      })
    )

    // 2. Send the email using your preferred email provider (Nodemailer, Resend, etc.)
    return sendEmail({
      to: supporter.supporterEmail,
      subject: subject,
      html: emailHtml.html as string,
    })
  })

  // Execute all email promises
  await Promise.all(emailPromises)

  return {
    success: true,
    message: `Email successfully sent to ${supporters.length} supporters.`,
    supporterCount: supporters.length,
  }
}

export const supporterServices = {
  getAllSupporter,
  getSupporterOverviewByCampaignId,
  sendEmailToCampaignSupporters,
}
