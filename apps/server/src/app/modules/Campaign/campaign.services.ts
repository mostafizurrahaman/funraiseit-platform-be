import {
  Campaign,
  campaignSearchableFields,
  CampaignStatus,
  CampaignStatusOrder,
  DigitalProduct,
  PhysicalProduct,
  Product,
  productType,
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

  console.log(payload)

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

    console.log({ downloadFileUrl })

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

const updateCampaign = async (id: string, payload: TUpdateCampaignPayloadType) => {
  const result = await Campaign.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
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
  addProductIntoCampaign,
}
