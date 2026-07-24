import {
  Campaign,
  CampaignStatus,
  CampaignStatusOrder,
  DigitalProduct,
  PhysicalProduct,
  Product,
  productSearchableFields,
  productType,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TAddProductIntoCampaignPayload,
  TGetAllProductQueryParamsType,
  TUpdateProductIntoCampaignPayload,
} from './product.validations'
import { uploadSingleFileToS3, type IMulterFile } from 'packages/media-hub/src'

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

const updateProductByIDIntoCampaign = async (
  user: IUser,
  productId: string,
  payload: TUpdateProductIntoCampaignPayload,
  productImage?: IMulterFile,
  downloadFile?: IMulterFile
) => {
  // Base product
  const baseProduct = await Product.findById(productId)

  if (!baseProduct) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found.')
  }

  // Campaign
  const campaign = await Campaign.findById(baseProduct.campaign)

  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
  }

  if (campaign.organizer.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This campaign does not belong to your account.')
  }

  if (CampaignStatusOrder[campaign.status] > CampaignStatusOrder[CampaignStatus.PENDING]) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Products can only be edited when the campaign is in Draft or Pending status.'
    )
  }

  // Product type cannot change
  if (payload.productType && payload.productType !== baseProduct.productType) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Product type cannot be changed. Delete and recreate the product instead.'
    )
  }

  /**
   * =====================================================
   * Physical Product
   * =====================================================
   */
  if (baseProduct.productType === productType.PHYSICAL) {
    const existingProduct = await PhysicalProduct.findById(productId)

    if (!existingProduct) {
      throw new AppError(httpStatus.NOT_FOUND, 'Physical product not found.')
    }

    let productImageUrl = existingProduct.productImage

    if (productImage) {
      const uploaded = await uploadSingleFileToS3(productImage, 'campaign/products')

      productImageUrl = uploaded.url
    }

    if (payload.sku && payload.sku !== existingProduct.sku) {
      const duplicateSku = await PhysicalProduct.exists({
        campaign: campaign._id,
        sku: payload.sku,
        _id: { $ne: existingProduct._id },
      })

      if (duplicateSku) {
        throw new AppError(
          httpStatus.CONFLICT,
          'A physical product already exists with the same SKU.'
        )
      }
    }

    return await PhysicalProduct.findByIdAndUpdate(
      productId,
      {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.description !== undefined && {
          description: payload.description,
        }),
        ...(payload.price !== undefined && { price: payload.price }),
        ...(payload.stock !== undefined && {
          stock: payload.stock,
          isUnlimited: payload.stock == null || payload.stock <= 0,
        }),
        ...(payload.weight !== undefined && {
          weight: payload.weight,
        }),
        ...(payload.sku !== undefined && {
          sku: payload.sku,
        }),
        productImage: productImageUrl,
      },
      {
        new: true,
        runValidators: true,
      }
    )
  }

  /**
   * =====================================================
   * Digital Product
   * =====================================================
   */
  const existingProduct = await DigitalProduct.findById(productId)

  if (!existingProduct) {
    throw new AppError(httpStatus.NOT_FOUND, 'Digital product not found.')
  }

  let productImageUrl = existingProduct.productImage

  if (productImage) {
    const uploaded = await uploadSingleFileToS3(productImage, 'campaign/products')

    productImageUrl = uploaded.url
  }

  let digitalFileUrl = existingProduct.digitalFileUrl

  if (downloadFile) {
    const uploaded = await uploadSingleFileToS3(downloadFile, 'campaign/products/downloadable')

    digitalFileUrl = uploaded.url
  }

  return await DigitalProduct.findByIdAndUpdate(
    productId,
    {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.description !== undefined && {
        description: payload.description,
      }),
      ...(payload.price !== undefined && { price: payload.price }),
      ...(payload.downloadFileName !== undefined && {
        digitalFileName: payload.downloadFileName,
      }),
      productImage: productImageUrl,
      digitalFileUrl,
    },
    {
      new: true,
      runValidators: true,
    }
  )
}

const getAllProduct = async (query: TGetAllProductQueryParamsType) => {
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
        $or: productSearchableFields.map((field) => ({
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

  const aggregated = await Product.aggregate(pipeline)

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

const getProductById = async (id: string) => {
  const result = await Product.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found')
  }

  return result
}

const deleteProductById = async (id: string) => {
  const result = await Product.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found')
  }

  return result
}

export const productServices = {
  addProductIntoCampaign,
  updateProductByIDIntoCampaign,
  getAllProduct,
  getProductById,
  deleteProductById,
}
