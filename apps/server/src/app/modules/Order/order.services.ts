import { paymentStatus } from './../../../../../../packages/db/src/apps/modules/Payment/payment.constants'
import {
  Account,
  accountStatus,
  AuthRoles,
  AuthStatus,
  Campaign,
  CampaignStatus,
  Currency,
  Order,
  OrderAddress,
  OrderItem,
  OrderItemStatus,
  OrderPayment,
  orderSearchableFields,
  OrderStatus,
  Payment,
  paymentType,
  PhysicalProduct,
  Product,
  productType,
  SiteInfo,
  Supporter,
  User,
  type IDigitalProduct,
  type IOrderDoc,
  type IPhysicalProduct,
  type IUser,
  type ProductDoc,
  type TOrderItemStatusType,
  type TOrderStatus,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'
import mongoose, { Types } from 'mongoose'
import { calculatePaymentBreakdown } from '@app/libs/get-stripe-fee-breakdown'
import { stripeCheckoutSessionWithApplicationFee } from '@app/libs/stripe'
import { logger } from '@app/libs/logger'
import { sendEmail } from '@repo/email-sender'

import type {
  TCreateOrderPayloadType,
  TGetAllOrderQueryParamsType,
  TPreviewOrderPayloadType,
} from './order.validations'

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

  const siteFee = await SiteInfo.findOne({})
  const platformFee = siteFee?.platformFee || 6

  const paymentBreakdown = calculatePaymentBreakdown({
    paymentType: paymentType.ORDER,
    productPrice: subTotal,
    shippingFee: shippingPrice,
    platformFeePercent: platformFee,
  })

  const mongoSession = await mongoose.startSession()

  try {
    mongoSession.startTransaction()
    // ?? Supporter:

    const newSupporter = await Supporter.findOneAndUpdate(
      {
        email: email?.trim(),
      },
      {
        $set: {
          name: fullName,
          phoneNumber: phone,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        session: mongoSession,
      }
    )

    if (!newSupporter) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to updated supporter info.')
    }

    // ?? Order :
    const [order] = await Order.create(
      [
        {
          campaign: campaign?._id,
          supporter: newSupporter._id,
          customerName: fullName,
          customerPhone: newSupporter.phoneNumber!,
          shippingType: shippingType!,
          subTotal: paymentBreakdown.databaseRecord.subtotal,
          totalAmount: paymentBreakdown.databaseRecord.grossAmount,
          shippingAmount: paymentBreakdown.databaseRecord.shippingFee,
          stripeFeePercentage: 2.9,
          platformFeePercentage: platformFee,
          status: OrderStatus.PENDING,
        },
      ],
      {
        session: mongoSession,
      }
    )

    if (!order) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to updated order.')
    }

    // ?? Stock update promises ( for Limited products)
    const physicalProductsToUpdate = products.filter(
      (p) => p.productType === 'physical' && !(p as IPhysicalProduct)?.isUnlimited
    )

    const stockUpdatedPromises = physicalProductsToUpdate.map(async (p) => {
      // ?? Customer given quantity:
      const requestQuantity = orderedQuantityMap.get(p._id?.toString()) ?? 0

      const updatedProduct = await Product?.findOneAndUpdate(
        {
          _id: p?._id,
          productType: productType.PHYSICAL,
          stock: {
            $gte: requestQuantity,
          },
        },
        {
          $inc: {
            stock: -requestQuantity,
          },
        },
        {
          returnDocument: 'after',
          session: mongoSession,
        }
      )

      if (!updatedProduct) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Insufficient stock for "${p.name}". Someone else may have just purchased the remaining inventory.`
        )
      }

      return updatedProduct
    })

    await Promise.all(stockUpdatedPromises)

    // ?? Order Item:

    const orderItemsPayload = products?.map((p) => ({
      order: order?._id,
      product: p?._id,
      quantity: orderedQuantityMap.get(p?._id?.toString())!,
      unitPrice: p?.price,
      status: OrderItemStatus.PENDING,
    }))

    // ?? Save the order items:
    const savedOrderItems = await OrderItem.create(orderItemsPayload, {
      ordered: true,
      session: mongoSession,
    })

    if (!savedOrderItems || savedOrderItems?.length < products?.length) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Order items failed to save.')
    }

    // ?? Save the order address :
    const [orderAddress] = await OrderAddress.create(
      [
        {
          supporter: newSupporter?._id,
          order: order?._id,
          phoneNumber: phone,
          addressLine1,
          addressLine2: addressLine2!,
          city,
          state,
          postalCode,
          country,
        },
      ],
      {
        session: mongoSession,
      }
    )

    if (!orderAddress) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to save ordered address.')
    }

    // ?? Initialize the payment:
    const session = await stripeCheckoutSessionWithApplicationFee({
      name: `Order ${order?._id} for ${newSupporter.name}`,
      unit_amount: paymentBreakdown.stripePayload.amount,
      application_fee: paymentBreakdown.stripePayload.application_fee_amount,
      destinationAccountId: orgAccount?.account,
      metadata: {
        organizer: campaignOrg?._id.toString(),
        campaign: campaign?._id.toString(),
        order: order?._id.toString(),
        supporter: newSupporter?._id.toString(),
        ...paymentBreakdown.databaseRecord,
      },
    })

    // ?? Initiate Payment:
    const [payment] = await OrderPayment.create(
      [
        {
          campaign: campaign._id,
          organizer: campaignOrg?._id,
          order: order?._id,
          supporter: newSupporter?._id,
          status: paymentStatus.PENDING,
          currency: Currency.USD,
          amount: paymentBreakdown.databaseRecord.grossAmount,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string,
          checkoutUrl: session.url!,
        },
      ],
      {
        session: mongoSession,
      }
    )

    if (!payment) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to save payment.')
    }

    await mongoSession.commitTransaction()

    return { url: session.url, paymentBreakdown: paymentBreakdown.databaseRecord }
  } catch (error) {
    await mongoSession.abortTransaction()
    throw error
  } finally {
    await mongoSession.endSession()
  }
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

  const siteFee = await SiteInfo.findOne({})
  const platformFee = siteFee?.platformFee || 6

  const paymentBreakdown = calculatePaymentBreakdown({
    paymentType: paymentType.ORDER,
    productPrice: subTotal,
    shippingFee: shippingPrice,
    platformFeePercent: platformFee,
  })

  return paymentBreakdown.databaseRecord
}

const getAllOrder = async (user: IUser, query: TGetAllOrderQueryParamsType) => {
  const {
    page: currentPage = 1,
    limit: currentLimit = 10,
    searchTerm,
    campaignId,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    orderStatus,
    paymentStatus,
    skipPagination = false,
    fromDate,

    toDate,
  } = query

  const limit = Number(currentLimit) || 1
  const page = Number(currentPage) || 10

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = []

  // ?? Campaign not found:
  const campaign = await Campaign?.findOne({
    organizer: user?._id,
    _id: new Types.ObjectId(campaignId),
  })

  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
  }

  if (campaignId) {
    pipeline.push({
      $match: {
        campaign: new Types.ObjectId(campaignId),
      },
    })
  }
  if (orderStatus) {
    pipeline.push({
      $match: {
        status: orderStatus,
      },
    })
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  pipeline.push(
    {
      $lookup: {
        from: 'supporters',
        localField: 'supporter',
        foreignField: '_id',
        as: 'supporterDetails',
      },
    },
    {
      $lookup: {
        from: 'orderaddresses',
        localField: '_id',
        foreignField: 'order',
        as: 'shippingAddress',
      },
    },
    {
      $lookup: {
        from: 'orderitems',
        localField: '_id',
        foreignField: 'order',
        as: 'orderItems',
        pipeline: [
          {
            $lookup: {
              from: 'products',
              localField: 'product',
              foreignField: '_id',
              as: 'productDetails',
            },
          },
          {
            $unwind: {
              path: '$productDetails',
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $project: {
              orderItemId: '$_id',
              purchasedQuantity: '$quantity',
              purchasedUnitPrice: '$unitPrice',
              orderItemStatus: '$status',

              // Product Info:
              productId: '$product',
              productName: '$productDetails.name',
              productImage: '$productDetails.productImage',
              productType: '$productDetails.productType',
              // productSku: '$productDetails.sku',

              createdAt: '$createdAt',
              updatedAt: '$updatedAt',
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'order',
        as: 'paymentDetails',
        pipeline: [
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $lookup: {
              from: 'paymentbreakdowns',
              localField: '_id',
              foreignField: 'payment',
              as: 'paymentBreakingDown',
              pipeline: [
                {
                  $sort: {
                    createdAt: -1,
                  },
                },
                {
                  $limit: 1,
                },
              ],
            },
          },
          {
            $unwind: {
              path: '$paymentBreakingDown',
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$supporterDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$shippingAddress',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        paymentDetails: {
          $arrayElemAt: ['$paymentDetails', 0],
        },
      },
    },
    {
      $project: {
        _id: 0,
        orderId: '$_id',
        campaignId: '$campaign',
        supporterId: '$supporter',

        // Order Provided supporter Name:
        customerName: '$customerName',
        customerPhone: '$customerPhone',
        shippingType: '$shippingType',

        // Supporter Info:
        supporterName: '$supporterDetails.name',
        supporterEmail: '$supporterDetails.email',
        supporterPhone: '$supporterDetails.phoneNumber',

        // Payment Info:
        paymentId: { $ifNull: ['$paymentDetails._id', null] },
        paymentBreakDownId: { $ifNull: ['$paymentDetails.paymentBreakingDown._id', null] },

        paidAt: {
          $ifNull: ['$paymentDetails.paidAt', null],
        },

        // Fees:
        stripeTransactionFeePercentage: '$stripeFeePercentage',
        platformFeePercentage: '$platformFeePercentage',

        // Amounts
        subTotal: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.subTotal', '$subTotal', 0],
        },
        shippingAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.shippingFee', '$shippingAmount', 0],
        },
        totalAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.totalAmount', '$totalAmount', 0],
        },
        stripeFeeAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.stripeFee', null],
        },
        platformFeeAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.platformFee', null],
        },
        organizerAmountWithoutShipping: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.organizerAmount', null],
        },
        organizerNetAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.organizerAmount', null],
        },
        paymentStatus: {
          $ifNull: ['$paymentDetails.status', null],
        },
        orderStatus: '$status',
        shippingAddress: '$shippingAddress',
        orderItems: '$orderItems',
      },
    }
  )

  if (paymentStatus) {
    pipeline.push({
      $match: {
        paymentStatus,
      },
    })
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

  const PaginationStages: PipelineStage.FacetPipelineStage[] = [
    {
      $match: {},
    },
  ]

  if (!skipPagination || (typeof skipPagination === 'string' && skipPagination !== 'true')) {
    PaginationStages.push({ $skip: skip }, { $limit: limit })
  }

  pipeline.push({
    $facet: {
      data: PaginationStages,
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await Order.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0

  return {
    data,
    meta: {
      page: skipPagination ? 1 : page,
      limit: skipPagination ? total : limit,
      total,
      totalPages: skipPagination ? 1 : Math.ceil(total / limit) || 1,
    },
  }
}

const getOrderById = async (user: IUser, id: string) => {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        _id: new Types.ObjectId(id),
      },
    },
  ]

  pipeline.push(
    {
      $lookup: {
        from: 'campaigns',
        localField: 'campaign',
        foreignField: '_id',
        as: 'campaignDetails',
      },
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
      $lookup: {
        from: 'orderaddresses',
        localField: '_id',
        foreignField: 'order',
        as: 'shippingAddress',
      },
    },
    {
      $lookup: {
        from: 'orderitems',
        localField: '_id',
        foreignField: 'order',
        as: 'orderItems',
        pipeline: [
          {
            $lookup: {
              from: 'products',
              localField: 'product',
              foreignField: '_id',
              as: 'productDetails',
            },
          },
          {
            $unwind: {
              path: '$productDetails',
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $project: {
              orderItemId: '$_id',
              purchasedQuantity: '$quantity',
              purchasedUnitPrice: '$unitPrice',
              orderItemStatus: '$status',

              // Product Info:
              productId: '$product',
              productName: '$productDetails.name',
              productImage: '$productDetails.productImage',
              productType: '$productDetails.productType',
              // productSku: '$productDetails.sku',

              createdAt: '$createdAt',
              updatedAt: '$updatedAt',
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'order',
        as: 'paymentDetails',
        pipeline: [
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $lookup: {
              from: 'paymentbreakdowns',
              localField: '_id',
              foreignField: 'payment',
              as: 'paymentBreakingDown',
              pipeline: [
                {
                  $sort: {
                    createdAt: -1,
                  },
                },
                {
                  $limit: 1,
                },
              ],
            },
          },
          {
            $unwind: {
              path: '$paymentBreakingDown',
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$supporterDetails',
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
      $unwind: {
        path: '$shippingAddress',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        paymentDetails: {
          $arrayElemAt: ['$paymentDetails', 0],
        },
      },
    },
    {
      $project: {
        _id: 0,
        orderId: '$_id',
        campaignId: '$campaign',
        supporterId: '$supporter',
        organizerId: '$campaignDetails.organizer',

        // Order Provided supporter Name:
        customerName: '$customerName',
        customerPhone: '$customerPhone',
        shippingType: '$shippingType',

        // Supporter Info:
        supporterName: '$supporterDetails.name',
        supporterEmail: '$supporterDetails.email',
        supporterPhone: '$supporterDetails.phoneNumber',

        // Payment Info:
        paymentId: { $ifNull: ['$paymentDetails._id', null] },
        paymentBreakDownId: { $ifNull: ['$paymentDetails.paymentBreakingDown._id', null] },

        paidAt: {
          $ifNull: ['$paymentDetails.paidAt', null],
        },

        // Fees:
        stripeTransactionFeePercentage: '$stripeFeePercentage',
        platformFeePercentage: '$platformFeePercentage',

        // Amounts
        subTotal: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.subTotal', '$subTotal', 0],
        },
        shippingAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.shippingFee', '$shippingAmount', 0],
        },
        totalAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.totalAmount', '$totalAmount', 0],
        },
        stripeFeeAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.stripeFee', null],
        },
        platformFeeAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.platformFee', null],
        },
        organizerAmountWithoutShipping: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.organizerAmount', null],
        },
        organizerNetAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.organizerAmount', null],
        },
        paymentStatus: {
          $ifNull: ['$paymentDetails.status', null],
        },
        orderStatus: '$status',
        shippingAddress: '$shippingAddress',
        orderItems: '$orderItems',
      },
    }
  )

  const order = await Order?.aggregate(pipeline)

  if (!order?.[0]) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found!')
  }

  if (order?.[0]?.organizerId?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This order is not belongs to your organization.')
  }

  return order[0]
}

const getCampaignOrderOverview = async (user: IUser, campaignId: string) => {
  // ?? Campaign order overview:
  const [totalOrders, totalOrderItems, totalSales, paidOrders, deliveredOrders] = await Promise.all(
    [
      // ?? Order Counts :
      await OrderPayment.aggregate([
        {
          $match: {
            campaign: new Types.ObjectId(campaignId),
            status: paymentStatus.PAID,
          },
        },
        {
          $count: 'total',
        },
      ]),
      // ?? Order Items :
      await OrderPayment.aggregate([
        {
          $match: {
            campaign: new Types.ObjectId(campaignId),
            status: paymentStatus.PAID,
          },
        },
        {
          $lookup: {
            from: 'orderitems',
            localField: 'order',
            foreignField: 'order',
            as: 'orderItems',
          },
        },
        {
          $unwind: {
            path: '$orderItems',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $count: 'total',
        },
      ]),

      // ?? total sales:
      await Payment.aggregate([
        {
          $match: {
            campaign: new Types.ObjectId(campaignId),
            status: paymentStatus.PAID,
            paymentType: {
              $in: [paymentType.ORDER],
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
      ]),

      // ?? Total completed Order :
      await Order?.aggregate([
        {
          $match: {
            campaign: new Types.ObjectId(campaignId),
            status: OrderStatus.PAID,
          },
        },
        {
          $count: 'total',
        },
      ]),
      await Order?.aggregate([
        {
          $match: {
            status: OrderStatus.DELIVERED,
            campaign: new Types.ObjectId(campaignId),
          },
        },
        {
          $count: 'total',
        },
      ]),
    ]
  )

  const totalOrder = totalOrders?.[0]?.total ?? 0
  const totalOrderedItems = totalOrderItems?.[0]?.total ?? 0
  const totalSale = totalSales?.[0] ?? {
    _id: null,
    subTotal: 0,
    shippingFee: 0,
    totalAmount: 0,
    stripeFee: 0,
    platformFee: 0,
    organizerAmount: 0,
    organizerAmountWithoutShipping: 0,
  }
  const paidOrder = paidOrders?.[0]?.total ?? 0
  const deliveredOrder = deliveredOrders?.[0]?.total ?? 0

  return {
    totalOrder,
    totalOrderedItems,
    totalSale,
    deliverableOrders: paidOrder,
    deliveredOrders: deliveredOrder,
  }
}

// ----------------------------------------------------
// Order & OrderItem Lifecycle Management Helpers & Services
// ----------------------------------------------------

const checkOrderAccess = async (user: IUser, order: IOrderDoc) => {
  const isAdmin = [AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN].includes(user.role as any)
  if (isAdmin) return true

  const campaign = await Campaign.findById(order.campaign)
  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found for this order.')
  }

  if (campaign.organizer.toString() !== user._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to manage orders for this campaign.'
    )
  }

  return true
}

const restockPhysicalProduct = async (
  productId: Types.ObjectId | string,
  quantity: number,
  session?: mongoose.ClientSession
) => {
  if (quantity <= 0) return
  const options = session ? { session } : {}
  await PhysicalProduct.findOneAndUpdate(
    {
      _id: productId,
      productType: productType.PHYSICAL,
      isUnlimited: false,
    },
    {
      $inc: {
        stock: quantity,
      },
    },
    options
  )
}

const sendDigitalDeliveryEmail = async (
  recipientEmail: string,
  customerName: string,
  productName: string,
  downloadUrl: string,
  campaignName: string
) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Your Digital Product is Ready!</h2>
        <p>Hi ${customerName || 'there'},</p>
        <p>Thank you for supporting <strong>${campaignName}</strong>. Your digital product is ready for download:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #222;">${productName}</p>
          <a href="${downloadUrl}" style="display: inline-block; background-color: #0070f3; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;" target="_blank">Download Product</a>
        </div>
        <p style="color: #666; font-size: 14px;">If the button above does not work, copy and paste this link into your browser:</p>
        <p style="color: #0070f3; word-break: break-all; font-size: 13px;">${downloadUrl}</p>
        <p style="color: #888; font-size: 12px; margin-top: 30px;">Thank you for your support!</p>
      </div>
    `
    await sendEmail({
      to: recipientEmail,
      subject: `Your digital download for "${productName}" is ready!`,
      html,
    })
  } catch (error) {
    logger.error('Failed to send digital delivery email', error)
  }
}

const syncParentOrderStatus = async (
  orderId: Types.ObjectId | string,
  session?: mongoose.ClientSession
) => {
  const options = session ? { session } : {}
  const order = await Order.findById(orderId, null, options)
  if (!order) return null

  if ([OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED].includes(order.status as any)) {
    return order
  }

  const items = await OrderItem.find({ order: order._id }, null, options)
  if (!items || items.length === 0) return order

  const isAllCancelled = items.every((item) => item.status === OrderItemStatus.CANCELLED)
  if (isAllCancelled) {
    order.status = OrderStatus.CANCELLED
    await order.save(options)
    return order
  }

  const activeItems = items.filter((item) => item.status !== OrderItemStatus.CANCELLED)

  const isAllActiveDelivered =
    activeItems.length > 0 &&
    activeItems.every(
      (item) => item.status === OrderItemStatus.SHIPPED || item.status === OrderItemStatus.FULFILLED
    )

  const isAnyActiveDelivered = activeItems.some(
    (item) => item.status === OrderItemStatus.SHIPPED || item.status === OrderItemStatus.FULFILLED
  )

  if (isAllActiveDelivered) {
    order.status = OrderStatus.DELIVERED
  } else if (isAnyActiveDelivered) {
    order.status = OrderStatus.PARTIALLY_FULFILLED
  } else {
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.PARTIALLY_FULFILLED
    ) {
      order.status = OrderStatus.PAID
    }
  }

  await order.save(options)
  return order
}

const cancelOrder = async (user: IUser, orderId: string, reason?: string) => {
  const order = await Order.findById(orderId)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found.')
  }

  await checkOrderAccess(user, order)

  if (order.status === OrderStatus.CANCELLED) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Order is already cancelled.')
  }

  if (order.status === OrderStatus.DELIVERED) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot cancel an already delivered order.')
  }

  const items = await OrderItem.find({
    order: order._id,
    status: { $ne: OrderItemStatus.CANCELLED },
  })

  for (const item of items) {
    item.status = OrderItemStatus.CANCELLED
    await item.save()
    await restockPhysicalProduct(item.product, item.quantity)
  }

  order.status = OrderStatus.CANCELLED
  await order.save()

  return {
    order,
    items,
    reason: reason || null,
  }
}

const cancelOrderItem = async (user: IUser, itemId: string, reason?: string) => {
  const item = await OrderItem.findById(itemId)
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order item not found.')
  }

  const order = await Order.findById(item.order)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Parent order not found.')
  }

  await checkOrderAccess(user, order)

  if (item.status === OrderItemStatus.CANCELLED) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Order item is already cancelled.')
  }

  if (item.status === OrderItemStatus.SHIPPED || item.status === OrderItemStatus.FULFILLED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot cancel an already delivered or fulfilled order item.'
    )
  }

  item.status = OrderItemStatus.CANCELLED
  await item.save()

  await restockPhysicalProduct(item.product, item.quantity)

  const updatedOrder = await syncParentOrderStatus(order._id)

  return {
    item,
    order: updatedOrder,
    reason: reason || null,
  }
}

const deliverPhysicalItem = async (user: IUser, itemId: string) => {
  const item = await OrderItem.findById(itemId)
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order item not found.')
  }

  const order = await Order.findById(item.order)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Parent order not found.')
  }

  await checkOrderAccess(user, order)

  if (![OrderStatus.PAID, OrderStatus.PARTIALLY_FULFILLED].includes(order.status as any)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot deliver items for an order with status "${order.status}". Order must be paid.`
    )
  }

  const product = await Product.findById(item.product)
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found.')
  }

  if (product.productType !== productType.PHYSICAL) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This item is a digital product. Please use the digital fulfillment endpoint.'
    )
  }

  if (item.status === OrderItemStatus.CANCELLED) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot deliver a cancelled order item.')
  }

  item.status = OrderItemStatus.SHIPPED
  await item.save()

  const updatedOrder = await syncParentOrderStatus(order._id)

  return {
    item,
    order: updatedOrder,
  }
}

const fulfillDigitalItem = async (user: IUser, itemId: string) => {
  const item = await OrderItem.findById(itemId)
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order item not found.')
  }

  const order = await Order.findById(item.order)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Parent order not found.')
  }

  await checkOrderAccess(user, order)

  if (![OrderStatus.PAID, OrderStatus.PARTIALLY_FULFILLED].includes(order.status as any)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot fulfill items for an order with status "${order.status}". Order must be paid.`
    )
  }

  const product = (await Product.findById(item.product)) as IDigitalProduct | null
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found.')
  }

  if (product.productType !== productType.DIGITAL) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This item is a physical product. Please use the physical delivery endpoint.'
    )
  }

  if (item.status === OrderItemStatus.CANCELLED) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot fulfill a cancelled order item.')
  }

  item.status = OrderItemStatus.FULFILLED
  await item.save()

  const supporter = await Supporter.findById(order.supporter)
  const campaign = await Campaign.findById(order.campaign)
  const targetEmail = supporter?.email

  if (targetEmail && product.digitalFileUrl) {
    await sendDigitalDeliveryEmail(
      targetEmail,
      order.customerName || supporter?.name || 'Valued Supporter',
      product.name,
      product.digitalFileUrl,
      campaign?.name || 'Campaign'
    )
  }

  const updatedOrder = await syncParentOrderStatus(order._id)

  return {
    item,
    order: updatedOrder,
    downloadUrl: product.digitalFileUrl,
  }
}

const deliverAllOrderItems = async (user: IUser, orderId: string) => {
  const order = await Order.findById(orderId)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found.')
  }

  await checkOrderAccess(user, order)

  if (![OrderStatus.PAID, OrderStatus.PARTIALLY_FULFILLED].includes(order.status as any)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot deliver items for an order with status "${order.status}". Order must be paid.`
    )
  }

  const pendingItems = await OrderItem.find({
    order: order._id,
    status: OrderItemStatus.PENDING,
  })

  if (pendingItems.length === 0) {
    return {
      order,
      message: 'No pending items to deliver.',
    }
  }

  const supporter = await Supporter.findById(order.supporter)
  const campaign = await Campaign.findById(order.campaign)
  const targetEmail = supporter?.email

  for (const item of pendingItems) {
    const product = await Product.findById(item.product)
    if (product?.productType === productType.DIGITAL) {
      item.status = OrderItemStatus.FULFILLED
      await item.save()

      const digitalProd = product as IDigitalProduct
      if (targetEmail && digitalProd?.digitalFileUrl) {
        await sendDigitalDeliveryEmail(
          targetEmail,
          order.customerName || supporter?.name || 'Valued Supporter',
          product.name,
          digitalProd.digitalFileUrl,
          campaign?.name || 'Campaign'
        )
      }
    } else {
      item.status = OrderItemStatus.SHIPPED
      await item.save()
    }
  }

  const updatedOrder = await syncParentOrderStatus(order._id)

  return {
    order: updatedOrder,
    deliveredCount: pendingItems.length,
  }
}

const updateOrderItemStatus = async (user: IUser, itemId: string, status: TOrderItemStatusType) => {
  const item = await OrderItem.findById(itemId)
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order item not found.')
  }

  const order = await Order.findById(item.order)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Parent order not found.')
  }

  await checkOrderAccess(user, order)

  if (
    [OrderItemStatus.SHIPPED, OrderItemStatus.FULFILLED].includes(status as any) &&
    ![OrderStatus.PAID, OrderStatus.PARTIALLY_FULFILLED].includes(order.status as any)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot mark item as delivered for unpaid order. Order status is "${order.status}".`
    )
  }

  const previousStatus = item.status
  item.status = status
  await item.save()

  if (status === OrderItemStatus.CANCELLED && previousStatus !== OrderItemStatus.CANCELLED) {
    await restockPhysicalProduct(item.product, item.quantity)
  }

  if (status === OrderItemStatus.FULFILLED && previousStatus !== OrderItemStatus.FULFILLED) {
    const product = await Product.findById(item.product)
    if (product?.productType === productType.DIGITAL) {
      const supporter = await Supporter.findById(order.supporter)
      const campaign = await Campaign.findById(order.campaign)
      const targetEmail = supporter?.email
      const digitalProd = product as unknown as IDigitalProduct

      if (targetEmail && digitalProd?.digitalFileUrl) {
        await sendDigitalDeliveryEmail(
          targetEmail,
          order.customerName || supporter?.name || 'Valued Supporter',
          product.name,
          digitalProd.digitalFileUrl,
          campaign?.name || 'Campaign'
        )
      }
    }
  }

  const updatedOrder = await syncParentOrderStatus(order._id)

  return {
    item,
    order: updatedOrder,
  }
}

const updateOrderStatus = async (user: IUser, orderId: string, status: TOrderStatus) => {
  const order = await Order.findById(orderId)
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found.')
  }

  await checkOrderAccess(user, order)

  if (
    status === OrderStatus.DELIVERED &&
    [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED].includes(order.status as any)
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot mark unpaid order as delivered.')
  }

  if (status === OrderStatus.DELIVERED) {
    const pendingItems = await OrderItem.find({
      order: order._id,
      status: {
        $nin: [OrderItemStatus.SHIPPED, OrderItemStatus.FULFILLED, OrderItemStatus.CANCELLED],
      },
    })

    const supporter = await Supporter.findById(order.supporter)
    const campaign = await Campaign.findById(order.campaign)
    const targetEmail = supporter?.email

    for (const item of pendingItems) {
      const product = await Product.findById(item.product)
      if (product?.productType === productType.DIGITAL) {
        item.status = OrderItemStatus.FULFILLED
        await item.save()

        const digitalProd = product as IDigitalProduct
        if (targetEmail && digitalProd?.digitalFileUrl) {
          await sendDigitalDeliveryEmail(
            targetEmail,
            order.customerName || supporter?.name || 'Valued Supporter',
            product.name,
            digitalProd.digitalFileUrl,
            campaign?.name || 'Campaign'
          )
        }
      } else {
        item.status = OrderItemStatus.SHIPPED
        await item.save()
      }
    }
  } else if (status === OrderStatus.CANCELLED) {
    const nonCancelledItems = await OrderItem.find({
      order: order._id,
      status: { $ne: OrderItemStatus.CANCELLED },
    })

    for (const item of nonCancelledItems) {
      item.status = OrderItemStatus.CANCELLED
      await item.save()
      await restockPhysicalProduct(item.product, item.quantity)
    }
  }

  order.status = status
  await order.save()

  return order
}

export const orderServices = {
  createOrder,
  getAllOrder,
  getOrderById,
  previewOrderPrice,
  getCampaignOrderOverview,
  cancelOrder,
  cancelOrderItem,
  deliverPhysicalItem,
  fulfillDigitalItem,
  deliverAllOrderItems,
  updateOrderItemStatus,
  updateOrderStatus,
}
