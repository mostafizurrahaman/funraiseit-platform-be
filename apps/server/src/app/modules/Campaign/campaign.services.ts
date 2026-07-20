import {
  Campaign,
  campaignSearchableFields,
  CampaignStatus,
  PromoCode,
  SiteInfo,
  type IPromoCodeDoc,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateCampaignPayloadType,
  TUpdateCampaignPayloadType,
  TGetAllCampaignQueryParamsType,
} from './campaign.validations'
import { uploadSingleFileToS3, type IMulterFile } from 'packages/media-hub/src'
import { generateCampaignCode } from './campaign.utils'
import { promoCodeServices } from '../PromoCode/promo-code.services'
import mongoose from 'mongoose'

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
    promoCode,
  } = payload

  // ?? Check this organizer already have aen campaign:
  const existingCampaign = await Campaign.findOne({
    organizer: user?._id,
    status: {
      $nin: [CampaignStatus.CANCELLED, CampaignStatus.COMPLETED, CampaignStatus.REJECTED],
    },
  })

  if (existingCampaign) {
    throw new AppError(
      httpStatus.CONFLICT,
      `A campaign with status "${existingCampaign.status}" already exists for your account. Only one active campaign is allowed at a time.`
    )
  }

  // ?? Retrieved the current lunch fee for campaign:
  const siteFees = await SiteInfo.findOne({})
  if (!siteFees || !siteFees.campaignLaunchFee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign launch fee not found!')
  }

  let finalLaunceFee = siteFees?.campaignLaunchFee || 0
  let discountValue = 0
  let promo = null
  if (promoCode) {
    const promo = await PromoCode.findOne({
      code: promoCode,
      isActive: true,
    })

    if (!promo) {
      throw new AppError(httpStatus.NOT_FOUND, 'Invalid Promo code!')
    }

    throw new AppError(httpStatus.BAD_REQUEST, 'This promo code is no longer available.')

    const calcValue = promoCodeServices.calculatePromoDiscount(
      siteFees?.campaignLaunchFee ?? 0,
      promo as IPromoCodeDoc
    )

    finalLaunceFee = calcValue.finalAmount
    discountValue = calcValue.discountAmount
    promo = promoCode
  }

  // ?? Upload the thumbnail:
  const { url } = await uploadSingleFileToS3(thumbnailFile, 'campaign/thumbnails')

  // ?? Campaign code generate:
  const campaignCode = await generateCampaignCode()

  const session = await mongoose.startSession()

  try {
    session.startTransaction()
    const newPayload = {
      organizer: user?._id,
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
      promoCode: promo?._id,
      launchFee: siteFees?.campaignLaunchFee,
      finalLaunceFee: finalLaunceFee,
      discountValue,
      status: CampaignStatus.DRAFT,
    }

    const [newCampaign] = await Campaign.create([newPayload], { session })

    if (!newCampaign) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create campaign')
    }
  } catch (error) {}

  const result = await Campaign.create(payload)
  return result
}

const updateCampaign = async (id: string, payload: TUpdateCampaignPayloadType) => {
  const result = await Campaign.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found')
  }

  return result
}

const getAllCampaign = async (query: TGetAllCampaignQueryParamsType) => {
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

const getCampaignById = async (id: string) => {
  const result = await Campaign.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found')
  }

  return result
}

const deleteCampaignById = async (id: string) => {
  const result = await Campaign.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found')
  }

  return result
}

export const campaignServices = {
  createCampaign,
  updateCampaign,
  getAllCampaign,
  getCampaignById,
  deleteCampaignById,
}
