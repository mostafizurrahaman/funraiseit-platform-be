import moment from 'moment'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { deleteSingleFileFromS3 } from '@repo/media-hub'
import {
  Account,
  accountStatus,
  AuthStatus,
  Campaign,
  campaignLunchPaymentStatus,
  campaignSearchableFields,
  CampaignStatus,
  discountType,
  Payment,
  PaymentBreakDown,
  paymentStatus,
  paymentType,
  Payout,
  PayoutPayment,
  PayoutStatus,
  Product,
  PromoCode,
  PromoCodeUsage,
  SiteInfo,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateCampaignPayloadType,
  TUpdateCampaignPayloadType,
  TGetAllCampaignQueryParamsType,
  TGetAllActiveCampaignQuery,
  TGetMyAllCampaignQueryParamsType,
  TCancelCampaignByOrganizationID,
  TRejectionCampaignByOrganizationID,
} from './campaign.validations'
import { uploadSingleFileToS3, type IMulterFile } from 'packages/media-hub/src'
import { generateCampaignCode } from './campaign.utils'
import mongoose, { Types } from 'mongoose'
import { createStripePayout, stripe, stripeCheckoutSession } from '@app/libs/stripe'
import { logger } from '@app/libs/logger'
import { enhanceCampaignStory } from '@app/libs/generate-story'

const createCampaign = async (
  user: IUser,
  payload: TCreateCampaignPayloadType,
  thumbnailFile: IMulterFile
) => {
  const {
    name,
    campaignCategory,
    story,
    fundUsage,
    goalAmount,
    allowDonation,
    allowLocalDelivery,
    allowLocalPickup,
    allowShipping,
    durationDays,
    shippingFee,
  } = payload

  if (!thumbnailFile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Thumbnail image is required!')
  }

  // Only one non-finished campaign is allowed
  const existingCampaign = await Campaign.findOne({
    organizer: user._id,
    status: {
      $nin: [CampaignStatus.CANCELLED, CampaignStatus.COMPLETED, CampaignStatus.REJECTED],
    },
  })

  if (existingCampaign) {
    throw new AppError(
      httpStatus.CONFLICT,
      `A campaign with status "${existingCampaign.status}" already exists for your account. Only one campaign is allowed at a time.`
    )
  }

  const siteFees = await SiteInfo.findOne({})

  if (!siteFees?.campaignLaunchFee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign launch fee not found!')
  }

  const { url } = await uploadSingleFileToS3(thumbnailFile, 'campaign/thumbnails')

  const campaignCode = await generateCampaignCode()

  const newCampaign = await Campaign.create({
    organizer: user._id,
    campaignCode,
    name,
    thumbnail: url,
    campaignCategory,
    story,
    fundUsage,
    goalAmount,
    raisedAmount: 0,
    allowDonation,
    allowLocalDelivery,
    allowLocalPickup,
    allowShipping,
    durationDays,
    shippingFee,
    finalLaunchFee: siteFees.campaignLaunchFee,
    launchFee: siteFees.campaignLaunchFee,
    status: CampaignStatus.DRAFT,
  })

  return newCampaign
}

const getDraftCampaign = async (user: IUser) => {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        status: CampaignStatus.DRAFT,
      },
    },
  ]

  // ?? Find out draft
  if (user?._id) {
    pipeline.push({
      $match: {
        organizer: user?._id,
      },
    })
  }

  pipeline.push(
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'campaign',
        as: 'products',
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
      $addFields: {
        totalProducts: { $size: '$products' },
        organizerName: { $ifNull: ['$organizerDetails.name', null] },
        organizerEmail: { $ifNull: ['$organizerDetails.email', null] },
        organizerProfileImage: { $ifNull: ['$organizerDetails.profileImage', null] },
        organizerStatus: { $ifNull: ['$organizerDetails.status', null] },
      },
    },
    {
      $project: {
        organizerDetails: 0,
      },
    }
  )

  const [campaign] = await Campaign.aggregate(pipeline)

  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'No Draft campaign exists.')
  }

  return campaign
}

const getCampaignPreview = async (user: IUser, campaignId: string, promoCode?: string) => {
  const campaign = await Campaign.findById(campaignId)

  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, "Campaign doesn't exist!")
  }

  if (campaign.organizer.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This campaign does not belong to this organizer.')
  }

  if (campaign.status !== CampaignStatus.DRAFT) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Only draft campaigns can be previewed.')
  }

  const siteFees = await SiteInfo.findOne({})

  if (!siteFees || !siteFees.campaignLaunchFee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Site is not ready yet.')
  }

  const products = await Product.find({ campaign: campaign?._id })
  if (products?.length < 1) {
    throw new AppError(httpStatus.NOT_FOUND, 'Please add products before preview!')
  }

  let discountAmount = 0
  let appliedPromoCode = null

  const originalAmount = Number(siteFees.campaignLaunchFee?.toFixed(2))

  if (promoCode) {
    const existingPromoCode = await PromoCode.findOne({
      code: promoCode.trim().toUpperCase(),
      isActive: true,
    })

    if (!existingPromoCode) {
      throw new AppError(httpStatus.NOT_FOUND, 'Promo code does not exist.')
    }

    if (existingPromoCode.usedCount >= existingPromoCode.usageLimit) {
      throw new AppError(httpStatus.BAD_REQUEST, 'This promo code is no longer available.')
    }

    if (new Date(existingPromoCode.expiresAt).getTime() < new Date().getTime()) {
      throw new AppError(httpStatus.BAD_REQUEST, 'This promo code is not active yet.')
    }

    // Already used?
    const isPromoCodeUsed = await PromoCodeUsage.exists({
      user: user._id,
      promoCode: existingPromoCode._id,
    })

    if (isPromoCodeUsed) {
      throw new AppError(httpStatus.CONFLICT, 'You have already used this promo code.')
    }

    if (existingPromoCode.discountType === discountType.PERCENTAGE) {
      discountAmount = (originalAmount * existingPromoCode.discountValue) / 100
    } else {
      discountAmount = existingPromoCode.discountValue
    }

    discountAmount = Number(Math.min(discountAmount, originalAmount).toFixed(2))

    appliedPromoCode = {
      _id: existingPromoCode._id,
      code: existingPromoCode.code,
      discountType: existingPromoCode.discountType,
      discountValue: existingPromoCode.discountValue,
    }
  }

  const payableAmount = Number(Math.max(originalAmount - discountAmount, 0).toFixed(2))

  return {
    campaign: campaign,
    paymentSummary: {
      originalAmount,
      discountAmount,
      payableAmount,
    },
    products: products?.length > 0 ? products : [],
    promoCode: appliedPromoCode,
  }
}

const updateCampaign = async (
  campaignId: string,
  user: IUser,
  payload: TUpdateCampaignPayloadType,
  thumbnailFile: IMulterFile
) => {
  // ?? Check is this campaign exists ?:
  const existingCampaign = await Campaign.findOne({
    _id: campaignId,
  })

  if (!existingCampaign) {
    throw new AppError(httpStatus.NOT_FOUND, "Campaign doesn't exists.")
  }

  if (existingCampaign.organizer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This campaign is not belongs to your account.')
  }

  if (
    ![CampaignStatus.DRAFT, CampaignStatus.PENDING].includes(
      existingCampaign?.status as 'draft' | 'pending'
    )
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Only draft or pending status campaign is editable. Current status ${existingCampaign?.status}`
    )
  }

  const allowLocalDelivery = payload.allowLocalDelivery ?? existingCampaign.allowLocalDelivery

  const allowLocalPickup = payload.allowLocalPickup ?? existingCampaign.allowLocalPickup

  const allowShipping = payload.allowShipping ?? existingCampaign.allowShipping

  const isOneOptionEnabled = allowLocalDelivery || allowLocalPickup || allowShipping

  if (!isOneOptionEnabled) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'At least one fulfillment option must be enabled (Local Pickup, Local Delivery, or Shipping).'
    )
  }
  const siteFees = await SiteInfo.findOne({})

  if (!siteFees?.campaignLaunchFee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign launch fee not found!')
  }

  // ?? Handle Thumbnail image:
  const oldThumbnailUrl = existingCampaign?.thumbnail as string
  let newThumbnailUrl: string | null = null

  if (thumbnailFile) {
    const { url } = await uploadSingleFileToS3(thumbnailFile, 'campaign/thumbnails')
    newThumbnailUrl = url
    existingCampaign.thumbnail = url
  }

  const changedAllowedShipping =
    payload.allowShipping && payload.allowShipping !== existingCampaign.allowShipping

  if (changedAllowedShipping && payload.allowShipping) {
    const newShippingFee = payload.shippingFee || existingCampaign.shippingFee

    if (newShippingFee >= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Shipping fee is required when shipping is enabled.'
      )
    }
    existingCampaign.shippingFee = newShippingFee
  }

  if (!payload.allowShipping && existingCampaign.shippingFee) existingCampaign.shippingFee = 0

  if (payload.name !== undefined) existingCampaign.name = payload.name
  if (payload.campaignCategory !== undefined)
    existingCampaign.campaignCategory = payload.campaignCategory
  if (payload.story !== undefined) existingCampaign.story = payload.story
  if (
    payload.fundUsage !== undefined &&
    Array.isArray(payload.fundUsage) &&
    payload.fundUsage?.length > 0
  ) {
    existingCampaign.fundUsage = payload.fundUsage as string[]
  }

  if (payload.goalAmount !== undefined)
    existingCampaign.goalAmount = Math.max(payload.goalAmount, 0)
  if (payload.allowDonation !== undefined) existingCampaign.allowDonation = payload.allowDonation
  if (payload.allowLocalPickup !== undefined)
    existingCampaign.allowLocalPickup = payload.allowLocalPickup
  if (payload.allowLocalDelivery !== undefined)
    existingCampaign.allowLocalDelivery = payload.allowLocalDelivery
  if (payload.allowShipping !== undefined) existingCampaign.allowShipping = payload.allowShipping

  if (payload.durationDays !== undefined) existingCampaign.durationDays = payload.durationDays
  existingCampaign.launchFee = Math.max(siteFees.campaignLaunchFee, 0)
  existingCampaign.finalLaunchFee = Math.max(siteFees.campaignLaunchFee, 0)

  await existingCampaign.save({
    validateBeforeSave: true,
  })

  if (existingCampaign.thumbnail === newThumbnailUrl && oldThumbnailUrl) {
    await deleteSingleFileFromS3(oldThumbnailUrl)
  }

  return existingCampaign
}

const getAllCampaign = async (query: TGetAllCampaignQueryParamsType) => {
  const {
    page: currentPage = 1,
    limit: currentLimit = 10,
    searchTerm,
    organizerId,
    organizerStatus,
    campaignStatus,
    campaignCategory,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
  } = query

  const page = Math.max(Number(currentPage), 1)
  const limit = Number(currentLimit) || 10
  const skip = (page - 1) * limit

  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (campaignStatus) {
    pipeline.push({
      $match: {
        status: campaignStatus,
      },
    })
  }

  if (organizerId) {
    pipeline.push({
      $match: {
        organizer: new Types.ObjectId(organizerId),
      },
    })
  }

  if (campaignCategory) {
    pipeline.push({
      $match: {
        campaignCategory,
      },
    })
  }

  pipeline.push(
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'campaign',
        as: 'products',
        pipeline: [
          {
            $count: 'total',
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'organizer',
        foreignField: '_id',
        as: 'organizerDetails',
        // pipeline: [
        //   {
        //     $count: 'total',
        //   },
        // ],
      },
    },
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'campaign',
        as: 'campaignDetails',
        pipeline: [
          {
            $match: {
              paymentType: {
                $in: [paymentType.DONATION, paymentType.ORDER],
              },
              status: paymentStatus.PAID,
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
              supporters: {
                $addToSet: '$supporter',
              },
              totalOrders: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.ORDER] }, 1, 0],
                },
              },
              totalDonations: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.DONATION] }, 1, 0],
                },
              },
              totalOrderedAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.ORDER] },
                    '$paymentBreakdown.totalAmount',
                    0,
                  ],
                },
              },
              totalDonationAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.DONATION] },
                    { $ifNull: ['$paymentBreakdown.totalAmount', 0] },
                    0,
                  ],
                },
              },
              subtotal: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.subtotal', 0],
                },
              },
              shippingFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.shippingFee', 0],
                },
              },
              totalAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.totalAmount', 0],
                },
              },
              stripeFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.stripeFee', 0],
                },
              },
              platformFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.platformFee', 0],
                },
              },
              organizerAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmount', 0],
                },
              },
              organizerAmountWithoutShipping: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmountWithoutShipping', 0],
                },
              },
            },
          },
          {
            $lookup: {
              from: 'supporters',
              localField: 'supporters',
              foreignField: '_id',
              as: 'supporters',
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$organizerDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$campaignDetails',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $addFields: {
        totalProducts: { $first: '$products.total' },
        organizerName: { $ifNull: ['$organizerDetails.name', null] },
        organizerEmail: { $ifNull: ['$organizerDetails.email', null] },
        organizerProfileImage: { $ifNull: ['$organizerDetails.profileImage', null] },
        organizerStatus: { $ifNull: ['$organizerDetails.status', null] },
        supporters: '$campaignDetails.supporters',
        remainingDays: {
          $cond: [
            {
              $in: [
                '$status',
                [CampaignStatus.ACTIVE, CampaignStatus.DRAFT, CampaignStatus.PENDING],
              ],
            },
            {
              $max: [
                0,
                {
                  $dateDiff: {
                    startDate: new Date(),
                    endDate: '$endAt',
                    unit: 'day',
                  },
                },
              ],
            },
            0,
          ],
        },

        totalSupporters: { $size: { $ifNull: ['$campaignDetails.supporters', []] } },
        totalDonations: '$campaignDetails.totalDonations',
        totalOrders: '$campaignDetails.totalOrders',
        orderedAmount: '$campaignDetails.totalOrderedAmount',
        donationAmount: '$campaignDetails.totalDonationAmount',
        subtotal: '$campaignDetails.subtotal',
        shippingFee: '$campaignDetails.shippingFee',
        totalAmount: '$campaignDetails.totalAmount',
        stripeFee: '$campaignDetails.stripeFee',
        platformFee: '$campaignDetails.platformFee',
        organizerAmount: '$campaignDetails.organizerAmount',
        organizerAmountWithoutShipping: '$campaignDetails.organizerAmountWithoutShipping',
        progress: {
          $divide: [
            {
              $multiply: [
                {
                  $ifNull: ['$campaignDetails.organizerAmount', 0],
                },
                100,
              ],
            },
            {
              $ifNull: ['$goalAmount', 0],
            },
          ],
        },
      },
    },
    {
      $project: {
        organizerDetails: 0,
        products: 0,
        campaignDetails: 0,
      },
    }
  )

  if (organizerStatus) {
    pipeline.push({
      $match: {
        organizerStatus,
      },
    })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: campaignSearchableFields.map((field) => ({
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

  const aggregated = await Campaign.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0
  const formattedData = data.map((campaign: any) => ({
    ...campaign,
    raisedAmountWithShipping: Number(campaign.raisedAmountWithShipping?.toFixed(2) ?? 0),
    raisedAmount: Number(campaign.raisedAmount?.toFixed(2) ?? 0),
    orderedAmount: Number(campaign.orderedAmount?.toFixed(2) ?? 0),
    donationAmount: Number(campaign.donationAmount?.toFixed(2) ?? 0),
    subtotal: Number(campaign.subtotal?.toFixed(2) ?? 0),
    totalAmount: Number(campaign.totalAmount?.toFixed(2) ?? 0),
    stripeFee: Number(campaign.stripeFee?.toFixed(2) ?? 0),
    platformFee: Number(campaign.platformFee?.toFixed(2) ?? 0),
    organizerAmount: Number(campaign.organizerAmount?.toFixed(2) ?? 0),
    organizerAmountWithoutShipping: Number(
      campaign.organizerAmountWithoutShipping?.toFixed(2) ?? 0
    ),
    progress: Number(campaign.progress?.toFixed(2) ?? 0),
  }))
  return {
    data: formattedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

const getMyAllCampaign = async (user: IUser, query: TGetMyAllCampaignQueryParamsType) => {
  const {
    page: currentPage = 1,
    limit: currentLimit = 10,
    searchTerm,
    campaignStatus,
    campaignCategory,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
  } = query

  const page = Math.max(Number(currentPage), 1)
  const limit = Number(currentLimit) || 10
  const skip = (page - 1) * limit

  const pipeline: PipelineStage[] = [
    {
      $match: {
        organizer: user?._id,
      },
    },
  ]

  if (campaignCategory) {
    pipeline.push({
      $match: {
        campaignCategory,
      },
    })
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (campaignStatus) {
    pipeline.push({
      $match: {
        status: campaignStatus,
      },
    })
  }

  pipeline.push(
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'campaign',
        as: 'products',
        pipeline: [
          {
            $count: 'total',
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'organizer',
        foreignField: '_id',
        as: 'organizerDetails',
        // pipeline: [
        //   {
        //     $count: 'total',
        //   },
        // ],
      },
    },
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'campaign',
        as: 'campaignDetails',
        pipeline: [
          {
            $match: {
              paymentType: {
                $in: [paymentType.DONATION, paymentType.ORDER],
              },
              status: paymentStatus.PAID,
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
              supporters: {
                $addToSet: '$supporter',
              },
              totalOrders: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.ORDER] }, 1, 0],
                },
              },
              totalDonations: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.DONATION] }, 1, 0],
                },
              },
              totalOrderedAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.ORDER] },
                    '$paymentBreakdown.totalAmount',
                    0,
                  ],
                },
              },
              totalDonationAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.DONATION] },
                    { $ifNull: ['$paymentBreakdown.totalAmount', 0] },
                    0,
                  ],
                },
              },
              subtotal: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.subtotal', 0],
                },
              },
              shippingFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.shippingFee', 0],
                },
              },
              totalAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.totalAmount', 0],
                },
              },
              stripeFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.stripeFee', 0],
                },
              },
              platformFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.platformFee', 0],
                },
              },
              organizerAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmount', 0],
                },
              },
              organizerAmountWithoutShipping: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmountWithoutShipping', 0],
                },
              },
            },
          },
          {
            $lookup: {
              from: 'supporters',
              localField: 'supporters',
              foreignField: '_id',
              as: 'supporters',
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$organizerDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$campaignDetails',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $addFields: {
        totalProducts: { $first: '$products.total' },
        organizerName: { $ifNull: ['$organizerDetails.name', null] },
        organizerEmail: { $ifNull: ['$organizerDetails.email', null] },
        organizerProfileImage: { $ifNull: ['$organizerDetails.profileImage', null] },
        organizerStatus: { $ifNull: ['$organizerDetails.status', null] },
        supporters: '$campaignDetails.supporters',
        remainingDays: {
          $cond: [
            {
              $in: [
                '$status',
                [CampaignStatus.ACTIVE, CampaignStatus.DRAFT, CampaignStatus.PENDING],
              ],
            },
            {
              $max: [
                0,
                {
                  $dateDiff: {
                    startDate: new Date(),
                    endDate: '$endAt',
                    unit: 'day',
                  },
                },
              ],
            },
            0,
          ],
        },

        totalSupporters: { $size: { $ifNull: ['$campaignDetails.supporters', []] } },
        totalDonations: '$campaignDetails.totalDonations',
        totalOrders: '$campaignDetails.totalOrders',
        orderedAmount: '$campaignDetails.totalOrderedAmount',
        donationAmount: '$campaignDetails.totalDonationAmount',
        subtotal: '$campaignDetails.subtotal',
        shippingFee: '$campaignDetails.shippingFee',
        totalAmount: '$campaignDetails.totalAmount',
        stripeFee: '$campaignDetails.stripeFee',
        platformFee: '$campaignDetails.platformFee',
        organizerAmount: '$campaignDetails.organizerAmount',
        organizerAmountWithoutShipping: '$campaignDetails.organizerAmountWithoutShipping',
        progress: {
          $divide: [
            {
              $multiply: [
                {
                  $ifNull: ['$campaignDetails.organizerAmount', 0],
                },
                100,
              ],
            },
            {
              $ifNull: ['$goalAmount', 0],
            },
          ],
        },
      },
    },
    {
      $project: {
        organizerDetails: 0,
        products: 0,
        campaignDetails: 0,
      },
    }
  )

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: campaignSearchableFields.map((field) => ({
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

  const aggregated = await Campaign.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0

  const formattedData = data.map((campaign: any) => ({
    ...campaign,
    raisedAmountWithShipping: Number(campaign.raisedAmountWithShipping?.toFixed(2) ?? 0),
    raisedAmount: Number(campaign.raisedAmount?.toFixed(2) ?? 0),
    orderedAmount: Number(campaign.orderedAmount?.toFixed(2) ?? 0),
    donationAmount: Number(campaign.donationAmount?.toFixed(2) ?? 0),
    subtotal: Number(campaign.subtotal?.toFixed(2) ?? 0),
    totalAmount: Number(campaign.totalAmount?.toFixed(2) ?? 0),
    stripeFee: Number(campaign.stripeFee?.toFixed(2) ?? 0),
    platformFee: Number(campaign.platformFee?.toFixed(2) ?? 0),
    organizerAmount: Number(campaign.organizerAmount?.toFixed(2) ?? 0),
    organizerAmountWithoutShipping: Number(
      campaign.organizerAmountWithoutShipping?.toFixed(2) ?? 0
    ),
    progress: Number(campaign.progress?.toFixed(2) ?? 0),
  }))

  return {
    data: formattedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

const getCampaignById = async (id: string) => {
  const pipeline: PipelineStage[] = []

  pipeline.push(
    {
      $match: {
        _id: new Types.ObjectId(id),
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'campaign',
        as: 'products',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'organizer',
        foreignField: '_id',
        as: 'organizerDetails',
        // pipeline: [
        //   {
        //     $count: 'total',
        //   },
        // ],
      },
    },
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'campaign',
        as: 'campaignDetails',
        pipeline: [
          {
            $match: {
              paymentType: {
                $in: [paymentType.DONATION, paymentType.ORDER],
              },
              status: paymentStatus.PAID,
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
              supporters: {
                $addToSet: '$supporter',
              },
              totalOrders: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.ORDER] }, 1, 0],
                },
              },
              totalDonations: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.DONATION] }, 1, 0],
                },
              },
              totalOrderedAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.ORDER] },
                    '$paymentBreakdown.totalAmount',
                    0,
                  ],
                },
              },
              totalDonationAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.DONATION] },
                    { $ifNull: ['$paymentBreakdown.totalAmount', 0] },
                    0,
                  ],
                },
              },
              subtotal: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.subtotal', 0],
                },
              },
              shippingFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.shippingFee', 0],
                },
              },
              totalAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.totalAmount', 0],
                },
              },
              stripeFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.stripeFee', 0],
                },
              },
              platformFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.platformFee', 0],
                },
              },
              organizerAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmount', 0],
                },
              },
              organizerAmountWithoutShipping: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmountWithoutShipping', 0],
                },
              },
            },
          },
          {
            $lookup: {
              from: 'supporters',
              localField: 'supporters',
              foreignField: '_id',
              as: 'supporters',
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$organizerDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$campaignDetails',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $addFields: {
        totalProducts: { $ifNull: [{ $size: '$products.total' }, 0] },
        organizerName: { $ifNull: ['$organizerDetails.name', null] },
        organizerEmail: { $ifNull: ['$organizerDetails.email', null] },
        organizerProfileImage: { $ifNull: ['$organizerDetails.profileImage', null] },
        organizerStatus: { $ifNull: ['$organizerDetails.status', null] },
        supporters: '$campaignDetails.supporters',
        remainingDays: {
          $cond: [
            {
              $in: [
                '$status',
                [CampaignStatus.ACTIVE, CampaignStatus.DRAFT, CampaignStatus.PENDING],
              ],
            },
            {
              $max: [
                0,
                {
                  $dateDiff: {
                    startDate: new Date(),
                    endDate: '$endAt',
                    unit: 'day',
                  },
                },
              ],
            },
            0,
          ],
        },

        totalSupporters: { $size: { $ifNull: ['$campaignDetails.supporters', []] } },
        totalDonations: '$campaignDetails.totalDonations',
        totalOrders: '$campaignDetails.totalOrders',
        orderedAmount: '$campaignDetails.totalOrderedAmount',
        donationAmount: '$campaignDetails.totalDonationAmount',
        subtotal: '$campaignDetails.subtotal',
        shippingFee: '$campaignDetails.shippingFee',
        totalAmount: '$campaignDetails.totalAmount',
        stripeFee: '$campaignDetails.stripeFee',
        platformFee: '$campaignDetails.platformFee',
        organizerAmount: '$campaignDetails.organizerAmount',
        organizerAmountWithoutShipping: '$campaignDetails.organizerAmountWithoutShipping',
        progress: {
          $divide: [
            {
              $multiply: [
                {
                  $ifNull: ['$campaignDetails.organizerAmount', 0],
                },
                100,
              ],
            },
            {
              $ifNull: ['$goalAmount', 0],
            },
          ],
        },
      },
    },
    {
      $project: {
        organizerDetails: 0,
        campaignDetails: 0,
      },
    }
  )

  const [campaign] = await Campaign.aggregate(pipeline)

  if (!campaign) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Campaign not found.')
  }

  return {
    ...campaign,
    raisedAmountWithShipping: Number(campaign.raisedAmountWithShipping?.toFixed(2) ?? 0),
    raisedAmount: Number(campaign.raisedAmount?.toFixed(2) ?? 0),
    orderedAmount: Number(campaign.orderedAmount?.toFixed(2) ?? 0),
    donationAmount: Number(campaign.donationAmount?.toFixed(2) ?? 0),
    subtotal: Number(campaign.subtotal?.toFixed(2) ?? 0),
    totalAmount: Number(campaign.totalAmount?.toFixed(2) ?? 0),
    stripeFee: Number(campaign.stripeFee?.toFixed(2) ?? 0),
    platformFee: Number(campaign.platformFee?.toFixed(2) ?? 0),
    organizerAmount: Number(campaign.organizerAmount?.toFixed(2) ?? 0),
    organizerAmountWithoutShipping: Number(
      campaign.organizerAmountWithoutShipping?.toFixed(2) ?? 0
    ),
    progress: Number(campaign.progress?.toFixed(2) ?? 0),
  }
}

const getCampaignByCampaignCode = async (code: string) => {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        campaignCode: code,
      },
    },
    {
      $lookup: {
        from: 'products',
        let: {
          campaignId: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$campaign', '$$campaignId'],
              },
            },
          },
        ],
        as: 'products',
      },
    },
    {
      $lookup: {
        from: 'users',
        let: {
          organizerId: '$organizer',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', '$$organizerId'],
              },
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              profileImage: 1,
              status: 1,
            },
          },
        ],
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
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'campaign',
        as: 'campaignDetails',
        pipeline: [
          {
            $match: {
              paymentType: {
                $in: [paymentType.DONATION, paymentType.ORDER],
              },
              status: paymentStatus.PAID,
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
              supporters: {
                $addToSet: '$supporter',
              },
              totalOrders: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.ORDER] }, 1, 0],
                },
              },
              totalDonations: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.DONATION] }, 1, 0],
                },
              },
              totalOrderedAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.ORDER] },
                    '$paymentBreakdown.totalAmount',
                    0,
                  ],
                },
              },
              totalDonationAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.DONATION] },
                    { $ifNull: ['$paymentBreakdown.totalAmount', 0] },
                    0,
                  ],
                },
              },
              subtotal: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.subtotal', 0],
                },
              },
              shippingFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.shippingFee', 0],
                },
              },
              totalAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.totalAmount', 0],
                },
              },
              stripeFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.stripeFee', 0],
                },
              },
              platformFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.platformFee', 0],
                },
              },
              organizerAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmount', 0],
                },
              },
              organizerAmountWithoutShipping: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmountWithoutShipping', 0],
                },
              },
            },
          },
          {
            $lookup: {
              from: 'supporters',
              localField: 'supporters',
              foreignField: '_id',
              as: 'supporters',
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$campaignDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        totalProducts: {
          $ifNull: [{ $size: '$products' }, 0],
        },

        organizerName: '$organizerDetails.name',
        organizerEmail: '$organizerDetails.email',
        organizerProfileImage: '$organizerDetails.profileImage',
        organizerStatus: '$organizerDetails.status',

        // Placeholder values (replace with real lookups later)
        supporters: '$campaignDetails.supporters',
        remainingDays: {
          $cond: [
            {
              $in: [
                '$status',
                [CampaignStatus.ACTIVE, CampaignStatus.DRAFT, CampaignStatus.PENDING],
              ],
            },
            {
              $max: [
                0,
                {
                  $dateDiff: {
                    startDate: new Date(),
                    endDate: '$endAt',
                    unit: 'day',
                  },
                },
              ],
            },
            0,
          ],
        },

        totalSupporters: { $size: { $ifNull: ['$campaignDetails.supporters', []] } },
        totalDonations: '$campaignDetails.totalDonations',
        totalOrders: '$campaignDetails.totalOrders',
        orderedAmount: '$campaignDetails.totalOrderedAmount',
        donationAmount: '$campaignDetails.totalDonationAmount',
        subtotal: '$campaignDetails.subtotal',
        shippingFee: '$campaignDetails.shippingFee',
        totalAmount: '$campaignDetails.totalAmount',
        stripeFee: '$campaignDetails.stripeFee',
        platformFee: '$campaignDetails.platformFee',
        organizerAmount: '$campaignDetails.organizerAmount',
        organizerAmountWithoutShipping: '$campaignDetails.organizerAmountWithoutShipping',
        progress: {
          $divide: [
            {
              $multiply: [
                {
                  $ifNull: ['$campaignDetails.organizerAmount', 0],
                },
                100,
              ],
            },
            {
              $ifNull: ['$goalAmount', 0],
            },
          ],
        },
      },
    },
    {
      $project: {
        organizerDetails: 0,
        campaignDetails: 0,
      },
    },
  ]

  const [campaign] = await Campaign.aggregate(pipeline)

  if (!campaign) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Campaign not found.')
  }

  if (campaign.status !== CampaignStatus.ACTIVE) {
    throw new AppError(httpStatus.BAD_REQUEST, 'The campaign is not live yet.')
  }

  if (campaign.organizerStatus !== AuthStatus.ACTIVE) {
    throw new AppError(httpStatus.BAD_REQUEST, 'The campaign organizer is not active.')
  }

  return {
    ...campaign,
    raisedAmountWithShipping: Number(campaign.raisedAmountWithShipping?.toFixed(2) ?? 0),
    raisedAmount: Number(campaign.raisedAmount?.toFixed(2) ?? 0),
    orderedAmount: Number(campaign.orderedAmount?.toFixed(2) ?? 0),
    donationAmount: Number(campaign.donationAmount?.toFixed(2) ?? 0),
    subtotal: Number(campaign.subtotal?.toFixed(2) ?? 0),
    totalAmount: Number(campaign.totalAmount?.toFixed(2) ?? 0),
    stripeFee: Number(campaign.stripeFee?.toFixed(2) ?? 0),
    platformFee: Number(campaign.platformFee?.toFixed(2) ?? 0),
    organizerAmount: Number(campaign.organizerAmount?.toFixed(2) ?? 0),
    organizerAmountWithoutShipping: Number(
      campaign.organizerAmountWithoutShipping?.toFixed(2) ?? 0
    ),
    progress: Number(campaign.progress?.toFixed(2) ?? 0),
  }
}

// const deleteCampaignById = async (id: string) => {
//   const result = await Campaign.findOneAndDelete({ _id: id })

//   if (!result) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found')
//   }

//   return result
// }

const launchCampaignByID = async (user: IUser, campaignId: string, promoCode?: string) => {
  const campaign = await Campaign.findById(campaignId)

  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, "Campaign doesn't exist!")
  }

  if (campaign.organizer.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This campaign does not belong to this organizer.')
  }

  if (campaign.status !== CampaignStatus.DRAFT) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Only draft campaigns can be lunch.')
  }

  if (campaign.paymentStatus === campaignLunchPaymentStatus.PAID) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment already completed for this campaign')
  }

  // ?? check organization stripe account :
  const orgAccount = await Account.findOne({
    user: user?._id,
  })

  if (!orgAccount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Before launching campaign setup organization bank account.'
    )
  }

  if (orgAccount.status !== accountStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Your connected bank account is ${accountStatus.RESTRICTED}. Please wait or submit documents.`
    )
  }

  const siteFees = await SiteInfo.findOne({})

  if (!siteFees || !siteFees.campaignLaunchFee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Site is not ready yet.')
  }

  const products = await Product.find({ campaign: campaign?._id })
  if (products?.length < 1) {
    throw new AppError(httpStatus.NOT_FOUND, 'Please add products before preview!')
  }

  if (campaign.paymentStatus === campaignLunchPaymentStatus.PENDING) {
    const lastPendingPayment = await Payment.findOne({
      campaign: campaign?._id,
      organizer: user?._id,
      paymentType: paymentType.LAUNCH_FEE,
      status: paymentStatus.PENDING,
    }).sort({ createdAt: -1 })

    if (lastPendingPayment) {
      if (
        lastPendingPayment?.expiresAt &&
        new Date(lastPendingPayment?.expiresAt).getTime() > new Date().getTime()
      ) {
        return {
          url: lastPendingPayment.checkoutUrl,
          expiresAt: lastPendingPayment.expiresAt,
          payment_required: true,
        }
      }
    } else {
      const session = await mongoose.startSession()

      try {
        session.startTransaction()
        if (campaign.promoCode) {
          const updatedPromoCode = await PromoCode.findOneAndUpdate(
            { _id: campaign?.promoCode },
            { $set: { usedCount: { $max: [{ $subtract: ['$usedCount', 1] }, 0] } } },
            { new: true, session }
          )

          if (!updatedPromoCode) {
            throw new AppError(httpStatus.NOT_FOUND, 'Failed to update promo code')
          }

          const usedCodeRemoved = await PromoCodeUsage.findOneAndDelete(
            { promoCode: campaign.promoCode, user: user?._id, campaign: campaign?._id },
            { session }
          )

          if (!usedCodeRemoved) {
            throw new AppError(httpStatus.NOT_FOUND, 'Failed to update promo usage.')
          }
        }

        const updatedCampaign = await Campaign.findOneAndUpdate(
          { _id: campaign?._id },
          {
            $set: {
              launchFee: siteFees.campaignLaunchFee,
              finalLaunchFee: siteFees.campaignLaunchFee,
              discountAmount: 0,
              promoCode: null,
              status: CampaignStatus.DRAFT,
              paymentStatus: campaignLunchPaymentStatus.NOT_INITIATED,
            },
          },
          { new: true, session }
        )

        if (!updatedCampaign) {
          throw new AppError(httpStatus.BAD_REQUEST, 'The campaign failed to update')
        }

        const deletedPendingPayment = await Payment.findOneAndDelete(
          {
            campaign: campaign?._id,
            organizer: user?._id,
            paymentType: paymentType.LAUNCH_FEE,
            status: paymentStatus.PENDING,
          },
          { session }
        )

        if (!deletedPendingPayment) {
          throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete last pending payment')
        }

        await PaymentBreakDown.deleteOne({ payment: deletedPendingPayment?._id }, { session })

        await session.commitTransaction()
        await session.endSession()
      } catch (err) {
        await session.abortTransaction()
        await session.endSession()
        throw err
      }
    }
  }

  let discountAmount = 0
  let appliedPromoCode = null

  const originalAmount = Number(siteFees.campaignLaunchFee?.toFixed(2))

  if (promoCode) {
    const existingPromoCode = await PromoCode.findOne({
      code: promoCode.trim().toUpperCase(),
      isActive: true,
    })

    if (!existingPromoCode) throw new AppError(httpStatus.NOT_FOUND, 'Promo code does not exist.')
    if (existingPromoCode.usedCount >= existingPromoCode.usageLimit)
      throw new AppError(httpStatus.BAD_REQUEST, 'This promo code is no longer available.')
    if (new Date(existingPromoCode.expiresAt).getTime() < new Date().getTime())
      throw new AppError(httpStatus.BAD_REQUEST, 'This promo code is not active yet.')

    const isPromoCodeUsed = await PromoCodeUsage.exists({
      user: user._id,
      promoCode: existingPromoCode._id,
    })

    if (isPromoCodeUsed)
      throw new AppError(httpStatus.CONFLICT, 'You have already used this promo code.')

    if (existingPromoCode.discountType === discountType.PERCENTAGE) {
      discountAmount = (originalAmount * existingPromoCode.discountValue) / 100
    } else {
      discountAmount = existingPromoCode.discountValue
    }

    discountAmount = Number(Math.min(discountAmount, originalAmount).toFixed(2))

    appliedPromoCode = {
      _id: existingPromoCode._id,
      code: existingPromoCode.code,
      discountType: existingPromoCode.discountType,
      discountValue: existingPromoCode.discountValue,
    }
  }

  const payableAmount = Number(Math.max(originalAmount - discountAmount, 0).toFixed(2))

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    const expiresAt = moment().add(30, 'minutes').toDate()

    if (appliedPromoCode) {
      const promoCodeDoc = await PromoCode.findOneAndUpdate(
        { _id: appliedPromoCode?._id },
        { $inc: { usedCount: 1 } },
        { new: true, session }
      )

      if (!promoCodeDoc) throw new AppError(httpStatus.BAD_REQUEST, 'Promo code failed to update.')

      await PromoCodeUsage.create(
        [
          {
            user: user?._id,
            promoCode: promoCodeDoc?._id,
            campaign: campaign?._id,
            discountType: promoCodeDoc?.discountType,
            discountValue: promoCodeDoc.discountValue,
            originalAmount: originalAmount,
            discountAmount: discountAmount,
            finalAmount: payableAmount,
            usedAt: new Date(),
          },
        ],
        { session }
      )
    }

    // 100% Free Campaign Bypass
    if (payableAmount === 0) {
      const updatedCampaign = await Campaign.findOneAndUpdate(
        { _id: campaign?._id },
        {
          $set: {
            launchFee: originalAmount,
            finalLaunchFee: payableAmount,
            discountAmount: discountAmount,
            promoCode: appliedPromoCode?._id,
            status: CampaignStatus.ACTIVE,
            paymentStatus: campaignLunchPaymentStatus.PAID,
          },
        },
        { new: true, session }
      )

      if (!updatedCampaign)
        throw new AppError(httpStatus.BAD_REQUEST, 'The campaign failed to update')

      const [payment] = await Payment.create(
        [
          {
            organizer: user?._id,
            campaign: updatedCampaign?._id,
            paymentType: paymentType.LAUNCH_FEE,
            status: paymentStatus.PAID,
            amount: payableAmount,
            paidAt: new Date(),
          },
        ],
        { session }
      )

      if (!payment) throw new AppError(httpStatus.BAD_REQUEST, 'The payment failed to update')

      await PaymentBreakDown.create(
        [
          {
            payment: payment?._id,
            subtotal: originalAmount,
            totalAmount: payableAmount,
            discountAmount: discountAmount,
          },
        ],
        { session }
      )

      await session.commitTransaction()
      await session.endSession()

      return {
        url: null,
        expiresAt: null,
        payment_required: false,
      }
    }

    const stripeExpiresAt = Math.floor(expiresAt.getTime() / 1000)

    const result = await stripeCheckoutSession({
      name: `${campaign.name} (Campaign Launch fee)`,
      unit_amount: Math.round(payableAmount * 100),
      expiresAt: stripeExpiresAt,
      metadata: {
        organizerId: user?._id?.toString(),
        campaignId: campaign?._id?.toString(),
        paymentType: paymentType.LAUNCH_FEE,
        payableAmount,
        discountAmount,
        originalAmount,
      },
    })

    const [payment] = await Payment.create(
      [
        {
          organizer: user?._id,
          campaign: campaign?._id,
          paymentType: paymentType.LAUNCH_FEE,
          status: paymentStatus.PENDING,
          amount: payableAmount,
          stripeCheckoutSessionId: result.id,
          expiresAt: expiresAt,
          checkoutUrl: result.url as string,
        },
      ],
      { session }
    )

    if (!payment) throw new AppError(httpStatus.BAD_REQUEST, 'The payment failed to update')

    const updatedCampaign = await Campaign.findOneAndUpdate(
      { _id: campaign?._id },
      {
        $set: {
          launchFee: originalAmount,
          finalLaunchFee: payableAmount,
          discountAmount: discountAmount,
          promoCode: appliedPromoCode?._id,
          status: CampaignStatus.DRAFT,
          paymentStatus: campaignLunchPaymentStatus.PENDING,
        },
      },
      { new: true, session }
    )

    if (!updatedCampaign)
      throw new AppError(httpStatus.BAD_REQUEST, 'The campaign failed to update')

    await session.commitTransaction()
    await session.endSession()

    return {
      url: result.url,
      expiresAt: expiresAt,
      payment_required: true,
    }
  } catch (err: any) {
    console.log(err)
    await session.abortTransaction()
    await session.endSession()
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message)
  }
}

const getAllActiveCampaign = async (query: TGetAllActiveCampaignQuery) => {
  const {
    page: currentPage = 1,
    limit: currentLimit = 10,
    searchTerm,
    organizerId,
    campaignCategory,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
  } = query

  const page = Math.max(Number(currentPage), 1)
  const limit = Number(currentLimit) || 10
  const skip = (page - 1) * limit

  const pipeline: PipelineStage[] = [
    {
      $match: {
        status: CampaignStatus.ACTIVE,
      },
    },
  ]

  if (campaignCategory) {
    pipeline.push({
      $match: {
        campaignCategory,
      },
    })
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (organizerId) {
    pipeline.push({
      $match: {
        organizer: new Types.ObjectId(organizerId),
      },
    })
  }

  pipeline.push(
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'campaign',
        as: 'products',
        pipeline: [
          {
            $count: 'total',
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'organizer',
        foreignField: '_id',
        as: 'organizerDetails',
        // pipeline: [
        //   {
        //     $count: 'total',
        //   },
        // ],
      },
    },
    {
      $unwind: {
        path: '$organizerDetails',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'campaign',
        as: 'campaignDetails',
        pipeline: [
          {
            $match: {
              paymentType: {
                $in: [paymentType.DONATION, paymentType.ORDER],
              },
              status: paymentStatus.PAID,
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
              supporters: {
                $addToSet: '$supporter',
              },
              totalOrders: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.ORDER] }, 1, 0],
                },
              },
              totalDonations: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.DONATION] }, 1, 0],
                },
              },
              totalOrderedAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.ORDER] },
                    '$paymentBreakdown.totalAmount',
                    0,
                  ],
                },
              },
              totalDonationAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.DONATION] },
                    { $ifNull: ['$paymentBreakdown.totalAmount', 0] },
                    0,
                  ],
                },
              },
              subtotal: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.subtotal', 0],
                },
              },
              shippingFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.shippingFee', 0],
                },
              },
              totalAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.totalAmount', 0],
                },
              },
              stripeFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.stripeFee', 0],
                },
              },
              platformFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.platformFee', 0],
                },
              },
              organizerAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmount', 0],
                },
              },
              organizerAmountWithoutShipping: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmountWithoutShipping', 0],
                },
              },
            },
          },
          {
            $lookup: {
              from: 'supporters',
              localField: 'supporters',
              foreignField: '_id',
              as: 'supporters',
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$campaignDetails',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $addFields: {
        totalProducts: { $first: '$products.total' },
        organizerName: { $ifNull: ['$organizerDetails.name', null] },
        organizerEmail: { $ifNull: ['$organizerDetails.email', null] },
        organizerProfileImage: { $ifNull: ['$organizerDetails.profileImage', null] },
        organizerStatus: { $ifNull: ['$organizerDetails.status', null] },
        supporters: '$campaignDetails.supporters',
        remainingDays: {
          $cond: [
            {
              $in: [
                '$status',
                [CampaignStatus.ACTIVE, CampaignStatus.DRAFT, CampaignStatus.PENDING],
              ],
            },
            {
              $max: [
                0,
                {
                  $dateDiff: {
                    startDate: new Date(),
                    endDate: '$endAt',
                    unit: 'day',
                  },
                },
              ],
            },
            0,
          ],
        },

        totalSupporters: { $size: { $ifNull: ['$campaignDetails.supporters', []] } },
        totalDonations: '$campaignDetails.totalDonations',
        totalOrders: '$campaignDetails.totalOrders',
        orderedAmount: '$campaignDetails.totalOrderedAmount',
        donationAmount: '$campaignDetails.totalDonationAmount',
        subtotal: '$campaignDetails.subtotal',
        shippingFee: '$campaignDetails.shippingFee',
        totalAmount: '$campaignDetails.totalAmount',
        stripeFee: '$campaignDetails.stripeFee',
        platformFee: '$campaignDetails.platformFee',
        organizerAmount: '$campaignDetails.organizerAmount',
        organizerAmountWithoutShipping: '$campaignDetails.organizerAmountWithoutShipping',
        progress: {
          $divide: [
            {
              $multiply: [
                {
                  $ifNull: ['$campaignDetails.organizerAmount', 0],
                },
                100,
              ],
            },
            {
              $ifNull: ['$goalAmount', 0],
            },
          ],
        },
      },
    },
    {
      $project: {
        organizerDetails: 0,
        products: 0,
      },
    },
    {
      $match: {
        organizerStatus: AuthStatus.ACTIVE,
      },
    }
  )

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: campaignSearchableFields.map((field) => ({
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

  const aggregated = await Campaign.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0
  const formattedData = data.map((campaign: any) => ({
    ...campaign,
    raisedAmountWithShipping: Number(campaign.raisedAmountWithShipping?.toFixed(2) ?? 0),
    raisedAmount: Number(campaign.raisedAmount?.toFixed(2) ?? 0),
    orderedAmount: Number(campaign.orderedAmount?.toFixed(2) ?? 0),
    donationAmount: Number(campaign.donationAmount?.toFixed(2) ?? 0),
    subtotal: Number(campaign.subtotal?.toFixed(2) ?? 0),
    totalAmount: Number(campaign.totalAmount?.toFixed(2) ?? 0),
    stripeFee: Number(campaign.stripeFee?.toFixed(2) ?? 0),
    platformFee: Number(campaign.platformFee?.toFixed(2) ?? 0),
    organizerAmount: Number(campaign.organizerAmount?.toFixed(2) ?? 0),
    organizerAmountWithoutShipping: Number(
      campaign.organizerAmountWithoutShipping?.toFixed(2) ?? 0
    ),
    progress: Number(campaign.progress?.toFixed(2) ?? 0),
  }))

  return {
    data: formattedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

const earlyCompleteCampaignById = async (user: IUser, campaignId: string) => {
  // ?? check campaign:
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
  }

  if (campaign?.organizer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.NOT_FOUND, `This campaign does not belong to your account.`)
  }
  if (campaign.status !== CampaignStatus.ACTIVE) {
    throw new AppError(httpStatus.BAD_REQUEST, `Only active campaigns can be completed early.`)
  }

  const now = moment().utc()

  const result = await Campaign.findOneAndUpdate(
    {
      _id: campaign?._id,
      status: CampaignStatus.ACTIVE,
    },
    {
      $set: {
        status: CampaignStatus.COMPLETED,
        endedAt: now.toDate(),
        expectedPayoutDate: now.clone().add(2, 'days').toDate(),
      },
    },
    {
      returnDocument: 'after',
    }
  )

  return result
}

const cancelCampaignByOrganizerByCampaignID = async (
  user: IUser,
  campaignId: string,
  payload: TCancelCampaignByOrganizationID
) => {
  const { cancelledReason } = payload

  // ?? check campaign:
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
  }

  if (campaign?.organizer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.NOT_FOUND, `This campaign does not belong to your account.`)
  }
  if (campaign.status !== CampaignStatus.ACTIVE) {
    throw new AppError(httpStatus.BAD_REQUEST, `Only active campaigns can be cancelled early.`)
  }

  const result = await Campaign.findOneAndUpdate(
    {
      _id: campaign?._id,
      status: CampaignStatus.ACTIVE,
    },
    {
      $set: {
        cancelledReason: cancelledReason,
        status: CampaignStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    },
    {
      returnDocument: 'after',
    }
  )

  return result
}

const flaggedCampaignByOrganizerByCampaignID = async (
  user: IUser,
  campaignId: string,
  payload: TRejectionCampaignByOrganizationID
) => {
  const { rejectedReason } = payload

  // ?? check campaign:
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
  }

  if (campaign.status !== CampaignStatus.ACTIVE) {
    throw new AppError(httpStatus.BAD_REQUEST, `Only active campaigns can be rejected.`)
  }

  const result = await Campaign.findOneAndUpdate(
    {
      _id: campaign?._id,
      status: CampaignStatus.ACTIVE,
    },
    {
      $set: {
        rejectedAt: new Date(),
        status: CampaignStatus.REJECTED,
        rejectionReason: rejectedReason,
      },
    },
    {
      returnDocument: 'after',
    }
  )

  return result
}

// ?? Complete the campaign which are in active and reached to end date:
const cronJobToCompleteCampaign = async () => {
  try {
    const now = moment().utc()
    const result = await Campaign.updateMany(
      { status: CampaignStatus.ACTIVE, endDate: { $lte: now.toDate() } },
      {
        $set: {
          status: CampaignStatus.COMPLETED,
          endedAt: now.toDate(),
          expectedPayoutDate: now.clone().add(2, 'days').toDate(),
        },
      }
    )
    logger.info(`Completed ${result.modifiedCount} campaigns at ${now.toISOString()}`)
  } catch (error) {
    logger.error('Failed to complete campaigns', error)
  }
}

const generateCampaignStory = async (story: string) => {
  if (!story || !story?.trim()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'story is required')
  }

  const result = await enhanceCampaignStory(story)

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to enhance story.')
  }

  return result
}
// ?? Find out the payout ready campaigns:
const cronJobToGetPayoutReadyCampaign = async () => {
  try {
    const now = moment().utc()
    const result = await Campaign.find({
      status: CampaignStatus.COMPLETED,
      expectedPayoutDate: {
        $lte: now.toDate(),
      },
      raisedAmount: {
        $gt: 0,
      },
    })

    for (const campaign of result) {
      const orgAccount = await Account.findOne({ user: campaign.organizer })

      if (!orgAccount || orgAccount.status !== accountStatus.ACTIVE) {
        logger.warn(`Campaign ${campaign._id} payout skipped (Account issue).`)
        continue
      }

      const balance = await stripe.balance.retrieve(
        {},
        {
          stripeAccount: orgAccount.account,
        }
      )

      const availableUsd = balance.available.find((item) => item.currency === 'usd')?.amount ?? 0

      const pendingUsd = balance.pending.find((item) => item.currency === 'usd')?.amount ?? 0

      if (availableUsd < campaign?.raisedAmountWithShipping) {
        logger.warn(
          `Campaign ${campaign._id}: payout is not ready. ` +
            `Required: $${campaign?.raisedAmountWithShipping}, ` +
            `Available: $${availableUsd / 100}, ` +
            `Pending: $${pendingUsd / 100}`
        )

        continue
      }

      // ==========================================
      // STEP 1: DB First (Locking the Campaign)
      // ==========================================
      const session = await mongoose.startSession()
      let localPayoutId: string

      try {
        session.startTransaction()

        // Create payout record before sending stripe:
        const [payout] = await Payout.create(
          [
            {
              organizer: campaign.organizer,
              campaign: campaign._id,
              stripePayoutId: 'pending',
              stripeAccountId: orgAccount.account,
              amount: campaign.raisedAmountWithShipping,
              currency: campaign.currency,
              status: PayoutStatus.PROCESSING,
            },
          ],
          { session }
        )

        localPayoutId = payout?._id?.toString() as string

        // Lock Campaign:
        await Campaign.findByIdAndUpdate(
          campaign._id,
          { status: CampaignStatus.PAYOUT_REQUEST },
          { session }
        )

        await session.commitTransaction()
      } catch (error) {
        await session.abortTransaction()
        logger.error(`Failed to lock campaign ${campaign._id} for payout`, error)
        continue
      } finally {
        await session.endSession()
      }

      // ==========================================
      // STEP 2: Call Stripe API Safely
      // ==========================================
      let stripePayout
      try {
        stripePayout = await createStripePayout(
          campaign.raisedAmountWithShipping,
          'usd',
          orgAccount.account,
          {
            campaignId: campaign._id.toString(),
            organizerId: campaign.organizer.toString(),
            payoutId: localPayoutId,
            raisedAmount: campaign.raisedAmount,
            raisedAmountWithShipping: campaign.raisedAmountWithShipping,
          },
          localPayoutId // idempotency key
        )
      } catch (stripeError: any) {
        //  Failed if stripe has not enough fund:
        logger.error(`Stripe Payout failed for campaign ${campaign._id}`, stripeError)

        //  Update the payout status to failed
        await Payout.findByIdAndUpdate(localPayoutId, {
          status: PayoutStatus.FAILED,
          failureMessage: stripeError.message,
          failedAt: new Date(),
        })
        //  Update the campaign status to failed
        await Campaign.findByIdAndUpdate(campaign._id, {
          status: CampaignStatus.COMPLETED,
          expectedPayoutDate: moment().add(1, 'days').toDate(),
        })
        continue
      }

      // ==========================================
      // STEP 3: Final DB Update (Success)
      // ==========================================
      try {
        // Update actual stripe payoutID
        await Payout.findByIdAndUpdate(localPayoutId, {
          stripePayoutId: stripePayout.id,
          status: PayoutStatus.PENDING,
        })

        await PayoutPayment.create({
          organizer: campaign.organizer,
          campaign: campaign._id,
          paymentType: paymentType.PAYOUT,
          status: paymentStatus.PENDING,
          currency: 'usd',
          amount: campaign.raisedAmountWithShipping,
          payoutId: localPayoutId,
          stripePayoutId: stripePayout.id,
        })

        logger.info(`Payout initiated for campaign ${campaign._id} successfully!`)
      } catch (dbError) {
        logger.error(
          `CRITICAL: Stripe Payout successful but final DB update failed. Webhook will handle it.`,
          dbError
        )
      }
    }

    logger.info(`Completed payout checks. Triggered ${result.length} payouts.`)
  } catch (error) {
    logger.error('Failed to run cronJobToGetPayoutReadyCampaign', error)
  }
}

export const campaignServices = {
  createCampaign,
  updateCampaign,
  getAllCampaign,
  getCampaignById,
  // deleteCampaignById,
  launchCampaignByID,
  getCampaignPreview,
  getAllActiveCampaign,
  getMyAllCampaign,
  getCampaignByCampaignCode,
  generateCampaignStory,
  getDraftCampaign,

  // CORN JOBS:
  cronJobToCompleteCampaign,
  cronJobToGetPayoutReadyCampaign,

  // EARLY COMPLETE :
  earlyCompleteCampaignById,
  cancelCampaignByOrganizerByCampaignID,
  flaggedCampaignByOrganizerByCampaignID,
}
