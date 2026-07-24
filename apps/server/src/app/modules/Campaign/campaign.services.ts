import { deleteSingleFileFromS3 } from '@repo/media-hub'
import {
  Campaign,
  campaignSearchableFields,
  CampaignStatus,
  CampaignStatusOrder,
  DigitalProduct,
  discountType,
  PhysicalProduct,
  Product,
  productType,
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
  TAddProductIntoCampaignPayload,
} from './campaign.validations'
import { uploadSingleFileToS3, type IMulterFile } from 'packages/media-hub/src'
import { generateCampaignCode } from './campaign.utils'

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

const addProductIntoCampaign = async (
  user: IUser,
  campaignId: string,
  payload: TAddProductIntoCampaignPayload,
  productImage: IMulterFile,
  downloadFile: IMulterFile
) => {
  // ? Check is this campaign exists :
  const campaign = await Campaign.findOne({
    _id: campaignId,
  })

  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, `Campaign doesn't exists wit this id.`)
  }

  // ? Check is this campaign belongs to your company:?
  if (campaign.organizer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This campaign is not belongs this organizer.')
  }

  // ? Check is the campaign:
  if (CampaignStatusOrder[campaign.status] > CampaignStatusOrder[CampaignStatus.PENDING]) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Products can only be uploaded when the campaign is in Draft or Pending status.'
    )
  }

  // ?? Retrieve Products :
  const totalProducts = await Product.countDocuments({
    campaign: campaign?._id,
  })

  if (totalProducts === 10) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot create more than 10 products.')
  }

  if (!productImage) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Product image is required.')
  }

  // ?? Check product and files :
  if (payload.productType === productType.DIGITAL && !downloadFile) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Downloadable file is required for digital type product.'
    )
  }
  if (payload.productType === productType.DIGITAL && !payload.downloadFileName) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Downloadable file name is required!')
  }

  // ?? Upload product image:
  const { url } = await uploadSingleFileToS3(productImage, 'campaign/products')

  if (payload.productType === productType.PHYSICAL) {
    if (payload.sku !== undefined) {
      const duplicateSku = await Product.exists({
        campaign: campaign?._id,
        sku: payload.sku,
      })

      if (duplicateSku) {
        throw new AppError(httpStatus.CONFLICT, 'A physical product exists with same sku.')
      }
    }

    const physicalProductPayload = {
      campaign: campaign?._id,
      name: payload.name,
      description: payload.description!,
      price: payload.price,
      productImage: url,
      productType: payload.productType,
      // physical product related fields:
      stock: (payload.stock as number) ?? null,
      isUnlimited: payload.stock ? false : true,
      sku: payload.sku!,
      weight: (payload.weight as number) ?? null,
    }

    const product = await PhysicalProduct.create(physicalProductPayload)

    return product
  }

  if (payload.productType === productType.DIGITAL) {
    const { url: downloadFileUrl } = await uploadSingleFileToS3(
      downloadFile,
      'campaign/products/downloadable'
    )

    const downloadableProduct = {
      campaign: campaign?._id,
      name: payload.name,
      description: payload.description!,
      price: payload.price,
      productImage: url,
      productType: payload.productType,
      digitalFileUrl: downloadFileUrl,
      digitalFileName: payload.downloadFileName!,
      downloadLimit: 10,
    }

    const product = await DigitalProduct.create(downloadableProduct)

    return product
  }
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
  addProductIntoCampaign,
  getCampaignPreview,
}
