import {
  BrandBuilder,
  BrandBuilderPayment,
  brandBuilderSearchableFields,
  brandBuilderStatus,
  Campaign,
  CampaignStatus,
  Payment,
  paymentStatus,
  paymentType,
  SiteInfo,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateBrandBuilderPayloadType,
  TUpdateBrandBuilderPayloadType,
  TGetAllBrandBuilderQueryParamsType,
} from './brand-builder.validations'
import {
  deleteSingleFileFromS3,
  uploadSingleFileToS3,
  type IMulterFile,
} from 'packages/media-hub/src'
import mongoose from 'mongoose'
import { stripeCheckoutSession } from '@app/libs/stripe'
import moment from 'moment'

interface IFilePayloadForBrandBuilder {
  brandImage: IMulterFile[]
  brandLogo: IMulterFile[]
}

const createBrandBuilder = async (
  user: IUser,
  payload: TCreateBrandBuilderPayloadType,
  files: IFilePayloadForBrandBuilder
) => {
  const { products, brandStyle, budget, businessName, colors, sellingItem } = payload

  // ?? Check is this user has any campaign which is completed, paid out, or payout_requested
  const existingCampaign = await Campaign.findOne({
    organizer: user?._id,
    status: {
      $in: [CampaignStatus.COMPLETED, CampaignStatus.PAID_OUT, CampaignStatus.PAYOUT_REQUEST],
    },
  })

  if (!existingCampaign) {
    throw new AppError(httpStatus.NOT_FOUND, `You don't have any successful campaign`)
  }

  const brandImageFile = files?.brandImage?.[0]
  const brandLogoFile = files?.brandLogo?.[0]

  if (!brandImageFile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Brand image is required!')
  }

  if (!brandLogoFile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Brand logo is required!')
  }

  const { url: brandImage } = await uploadSingleFileToS3(brandImageFile, 'brandBuilder/brandImage')
  const { url: brandLogo } = await uploadSingleFileToS3(brandLogoFile, 'brandBuilder/brandLogo')

  // ?? Site Config:
  const siteConfig = await SiteInfo.findOne({})

  if (!siteConfig) {
    throw new AppError(httpStatus.NOT_FOUND, `Site config does not found.`)
  }

  const brandBuilderFee = siteConfig.brandBuilderPricing ?? 39.99 // default three 39.99
  const mongoSession = await mongoose.startSession()

  try {
    mongoSession.startTransaction()

    const expiresAt = moment().add(30, 'minutes').toDate()
    const stripeExpiresAt = Math.floor(expiresAt.getTime() / 1000)

    const brandBuilders = {
      organizer: user?._id,
      products,
      businessName,
      sellingItem,
      brandImage,
      brandLogo,
      colors,
      brandStyle,
      budget,
      brandBuilderFee,
      paidAmount: 0,
      status: brandBuilderStatus.PENDING,
    }

    const [brandBuilder] = await BrandBuilder.create([brandBuilders], {
      session: mongoSession,
    })

    if (!brandBuilder) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Brand builder not found!')
    }

    // ?? Prepare Payment:
    const result = await stripeCheckoutSession({
      name: `Brand Builder Payment for ${businessName}`,
      unit_amount: Math.round(brandBuilderFee * 100),
      expiresAt: stripeExpiresAt,
      metadata: {
        brandBuilderId: brandBuilder?._id?.toString() as string,
        organizerId: user?._id?.toString(),
        brandBuilderFee,
      },
    })

    // ?? Prepare Payment:
    const [payment] = await BrandBuilderPayment.create(
      [
        {
          organizer: user?._id,
          brandBuilderId: brandBuilder?._id,
          paymentType: paymentType.BRAND_BUILDER,
          status: paymentStatus.PENDING,
          amount: brandBuilderFee,
          stripeCheckoutSessionId: result?.id as string,
          stripePaymentIntentId: result.payment_intent as string,
          checkoutUrl: result?.url as string,
        },
      ],
      {
        session: mongoSession,
      }
    )

    if (!payment) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to initiate payment.')
    }

    // ?? 

    await mongoSession.commitTransaction()
    return {
      url: result.url,
      expiresAt,
    }
  } catch (error) {
    await mongoSession.abortTransaction()

    if (brandImage) {
      await deleteSingleFileFromS3(brandImage)
    }
    if (brandLogo) {
      await deleteSingleFileFromS3(brandLogo)
    }

    throw error
  } finally {
    await mongoSession.endSession()
  }
}

const updateBrandBuilder = async (id: string, payload: TUpdateBrandBuilderPayloadType) => {
  const result = await BrandBuilder.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'BrandBuilder not found')
  }

  return result
}

const getAllBrandBuilder = async (query: TGetAllBrandBuilderQueryParamsType) => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
  } = query

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: brandBuilderSearchableFields.map((field) => ({
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

  const aggregated = await BrandBuilder.aggregate(pipeline)

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

const getBrandBuilderById = async (id: string) => {
  const result = await BrandBuilder.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'BrandBuilder not found')
  }

  return result
}

const deleteBrandBuilderById = async (id: string) => {
  const result = await BrandBuilder.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'BrandBuilder not found')
  }

  return result
}

export const brandBuilderServices = {
  createBrandBuilder,
  updateBrandBuilder,
  getAllBrandBuilder,
  getBrandBuilderById,
  deleteBrandBuilderById,
}
