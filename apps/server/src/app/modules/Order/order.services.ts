import {
  Account,
  accountStatus,
  AuthStatus,
  Campaign,
  CampaignStatus,
  Order,
  orderSearchableFields,
  paymentType,
  Product,
  User,
  type IDigitalProduct,
  type IPhysicalProduct,
  type IProduct,
  type IProductDoc,
  type ProductDoc,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateOrderPayloadType,
  TUpdateOrderPayloadType,
  TGetAllOrderQueryParamsType,
  TPreviewOrderPayloadType,
} from './order.validations'
import { calculatePaymentBreakdown } from '@app/libs/get-stripe-fee-breakdown'

const createOrder = async (payload: TCreateOrderPayloadType) => {
  const {
    campaignId,
    orderItems,
    fullName,
    email,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    shippingType,
  } = payload

  // ?? Check is the campaign exists ?:
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
  }

  // ?? If Campaign is not active you can not order:
  if (campaign.status !== CampaignStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Only active campaigns can receive orders. Current status "${campaign.status}"`
    )
  }

  const now = Date.now()

  // Check if campaign has ended for donations
  if (campaign.endDate && new Date(campaign.endDate).getTime() < now) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This campaign has ended. Donations are no longer accepted.'
    )
  }

  // Check if campaign has not started yet for donations
  if (campaign.startDate && new Date(campaign.startDate).getTime() > now) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This campaign has not started yet. Donations cannot be made.'
    )
  }

  // ?? Campaign organization :
  const campaignOrg = await User.findOne({
    _id: campaign?.organizer,
  })

  if (!campaignOrg) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign organizer not found.')
  }

  // ?? Campaign Owner status:
  if (campaignOrg.status !== AuthStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Only active organizer can receive donations. Current Organizer status "${campaignOrg.status}"`
    )
  }

  const orgAccount = await Account.findOne({
    user: campaignOrg?._id,
  })

  if (!orgAccount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The organizer has not connected a payment account and cannot receive donations.'
    )
  }
  if (orgAccount.status !== accountStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "The organizer's payment account is not active. Donations are temporarily unavailable."
    )
  }

  // ?? Check for shipping:
  if (shippingType === 'local_delivery' && !campaign.allowLocalDelivery) {
    throw new AppError(httpStatus.NOT_FOUND, 'Local delivery not allowed')
  }

  if (shippingType === 'local_pickup' && !campaign.allowLocalDelivery) {
    throw new AppError(httpStatus.NOT_FOUND, 'Local pickup not allowed')
  }

  if (shippingType === 'shipping' && !campaign.allowShipping) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shipping not allowed')
  }

  // ?? Check duplicate items in order items:
  const orderItemProductMap = new Map<string, number>()

  orderItems.forEach(({ product }, index) => {
    if (orderItemProductMap.has(product)) {
      throw new AppError(httpStatus.BAD_REQUEST, `Duplicate product found in order items.`)
    }

    orderItemProductMap.set(product, index)
  })

  // ?? check is all product available ? :
  const productsIds = orderItems?.map((item) => item.product)
  const products: ProductDoc[] = (await Product.find({
    _id: {
      $in: productsIds,
    },
  }).lean<ProductDoc[]>()) as ProductDoc[]

  if (products?.length < orderItems?.length) {
    throw new AppError(httpStatus.BAD_REQUEST, 'One or more products are unavailable!')
  }

  // ?? Product Map :
  const productMap: Map<string, ProductDoc> = new Map()
  const orderedQuantityMap: Map<string, number> = new Map()

  //  ?? set product into product map against id:
  products?.map((p) => {
    productMap.set(p._id?.toString(), p)
  })

  // ?? Set product quantity which is coming from fe against id:
  orderItems?.map((p) => {
    orderedQuantityMap.set(p.product, p.quantity)
  })

  // ?? Validate Quantity for physical product
  for (const p of products) {
    if (p.productType !== 'physical') continue
    if (p.productType === 'physical' && (p as IPhysicalProduct)?.isUnlimited) continue

    // ?? Check for limited stock products:
    const customerGivenQuantity = orderedQuantityMap.get(p?._id?.toString()) || 0

    if (!customerGivenQuantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Invalid quantity for this ${p.name}. Min 1 quantity required.`
      )
    }

    const dbQuantity = (p as IPhysicalProduct).stock || 0

    if (!dbQuantity || dbQuantity < 1 || dbQuantity < customerGivenQuantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Insufficient stock for "${p.name}". Requested ${customerGivenQuantity}, but only ${dbQuantity} available.`
      )
    }
  }

  // ?? calculate the product price :
  const subTotal = products?.reduce((acc, p) => {
    const customerGivenQuantity = orderedQuantityMap.get(p._id?.toString()) || 0
    const pricePerUnit = Math.max(p.price, 0)
    const productPrice = customerGivenQuantity * pricePerUnit

    acc += productPrice

    return acc
  }, 0)

  const shippingPrice =
    campaign?.allowShipping && shippingType === 'shipping' ? (campaign.shippingFee ?? 0) : 0

  const paymentBreakdown = calculatePaymentBreakdown({
    paymentType: paymentType.ORDER,
    productPrice: subTotal,
    shippingFee: shippingPrice,
  })

  return paymentBreakdown
}

const previewOrderPrice = async (payload: TPreviewOrderPayloadType) => {
  const {
    campaignId,
    orderItems,

    shippingType,
  } = payload

  // ?? Check is the campaign exists ?:
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
  }

  // ?? If Campaign is not active you can not order:
  if (campaign.status !== CampaignStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Only active campaigns can receive orders. Current status "${campaign.status}"`
    )
  }

  const now = Date.now()

  // Check if campaign has ended for donations
  if (campaign.endDate && new Date(campaign.endDate).getTime() < now) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This campaign has ended. Donations are no longer accepted.'
    )
  }

  // Check if campaign has not started yet for donations
  if (campaign.startDate && new Date(campaign.startDate).getTime() > now) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This campaign has not started yet. Donations cannot be made.'
    )
  }

  // ?? Campaign organization :
  const campaignOrg = await User.findOne({
    _id: campaign?.organizer,
  })

  if (!campaignOrg) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign organizer not found.')
  }

  // ?? Campaign Owner status:
  if (campaignOrg.status !== AuthStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Only active organizer can receive donations. Current Organizer status "${campaignOrg.status}"`
    )
  }

  const orgAccount = await Account.findOne({
    user: campaignOrg?._id,
  })

  if (!orgAccount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The organizer has not connected a payment account and cannot receive donations.'
    )
  }
  if (orgAccount.status !== accountStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "The organizer's payment account is not active. Donations are temporarily unavailable."
    )
  }

  // ?? Check for shipping:
  if (shippingType === 'local_delivery' && !campaign.allowLocalDelivery) {
    throw new AppError(httpStatus.NOT_FOUND, 'Local delivery not allowed')
  }

  if (shippingType === 'local_pickup' && !campaign.allowLocalDelivery) {
    throw new AppError(httpStatus.NOT_FOUND, 'Local pickup not allowed')
  }

  if (shippingType === 'shipping' && !campaign.allowShipping) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shipping not allowed')
  }

  // ?? Check duplicate items in order items:
  const orderItemProductMap = new Map<string, number>()

  orderItems.forEach(({ product }, index) => {
    if (orderItemProductMap.has(product)) {
      throw new AppError(httpStatus.BAD_REQUEST, `Duplicate product found in order items.`)
    }

    orderItemProductMap.set(product, index)
  })

  // ?? check is all product available ? :
  const productsIds = orderItems?.map((item) => item.product)
  const products: ProductDoc[] = (await Product.find({
    _id: {
      $in: productsIds,
    },
  }).lean<ProductDoc[]>()) as ProductDoc[]

  if (products?.length < orderItems?.length) {
    throw new AppError(httpStatus.BAD_REQUEST, 'One or more products are unavailable!')
  }

  // ?? Product Map :
  const productMap: Map<string, ProductDoc> = new Map()
  const orderedQuantityMap: Map<string, number> = new Map()

  //  ?? set product into product map against id:
  products?.map((p) => {
    productMap.set(p._id?.toString(), p)
  })

  // ?? Set product quantity which is coming from fe against id:
  orderItems?.map((p) => {
    orderedQuantityMap.set(p.product, p.quantity)
  })

  // ?? Validate Quantity for physical product
  for (const p of products) {
    if (p.productType !== 'physical') continue
    if (p.productType === 'physical' && (p as IPhysicalProduct)?.isUnlimited) continue

    // ?? Check for limited stock products:
    const customerGivenQuantity = orderedQuantityMap.get(p?._id?.toString()) || 0

    if (!customerGivenQuantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Invalid quantity for this ${p.name}. Min 1 quantity required.`
      )
    }

    const dbQuantity = (p as IPhysicalProduct).stock || 0

    if (!dbQuantity || dbQuantity < 1 || dbQuantity < customerGivenQuantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Insufficient stock for "${p.name}". Requested ${customerGivenQuantity}, but only ${dbQuantity} available.`
      )
    }
  }

  // ?? calculate the product price :
  const subTotal = products?.reduce((acc, p) => {
    const customerGivenQuantity = orderedQuantityMap.get(p._id?.toString()) || 0
    const pricePerUnit = Math.max(p.price, 0)
    const productPrice = customerGivenQuantity * pricePerUnit

    acc += productPrice

    return acc
  }, 0)

  const shippingPrice =
    campaign?.allowShipping && shippingType === 'shipping' ? (campaign.shippingFee ?? 0) : 0

  const paymentBreakdown = calculatePaymentBreakdown({
    paymentType: paymentType.ORDER,
    productPrice: subTotal,
    shippingFee: shippingPrice,
  })

  return paymentBreakdown.databaseRecord
}

const updateOrder = async (id: string, payload: TUpdateOrderPayloadType) => {
  const result = await Order.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found')
  }

  return result
}

const getAllOrder = async (query: TGetAllOrderQueryParamsType) => {
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
        $or: orderSearchableFields.map((field) => ({
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

  const aggregated = await Order.aggregate(pipeline)

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

const getOrderById = async (id: string) => {
  const result = await Order.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found')
  }

  return result
}

const deleteOrderById = async (id: string) => {
  const result = await Order.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found')
  }

  return result
}

export const orderServices = {
  createOrder,
  updateOrder,
  getAllOrder,
  getOrderById,
  deleteOrderById,
  previewOrderPrice,
}
