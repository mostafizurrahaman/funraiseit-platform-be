import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredMongooseId,
  positiveNumber,
  enumString,
  requiredEmail,
  usaPhoneRegex,
} from '@repo/shared'
import {
  orderSortableFields,
  OrderStatusValues,
  paymentStatusValues,
  productType,
  productTypeValues,
  shippingTypesValues,
} from '@repo/db'

const orderItemSchema = z.object({
  product: requiredMongooseId('Product ID'),
  productType: enumString(productTypeValues, 'Product type'),
  quantity: positiveNumber('quantity'),
})

const createOrderSchema = z.object({
  body: z
    .object({
      campaignId: requiredMongooseId('Campaign ID'),
      shippingType: enumString(shippingTypesValues, 'Shipping type').optional(),

      // Product:
      orderItems: z
        .array(orderItemSchema, {
          error: 'Order items should be an array of product & quantity.',
        })
        .min(1, {
          error: 'Min. one order item required!',
        }),

      // Supporter:
      fullName: requiredString('Full name'),
      email: requiredEmail('Email'),
      phone: requiredString('Phone number').regex(usaPhoneRegex, {
        error: 'Phone number should be valid usa number.',
      }),
      addressLine1: requiredString('Address line 1'),
      addressLine2: optionalString('Address line 2'),
      city: requiredString('City'),
      state: requiredString('State'),
      postalCode: requiredString('Postal code'),
      country: requiredString('Country'),
    })
    .superRefine((data, ctx) => {
      const { orderItems, shippingType } = data

      const digitalItems = orderItems.filter((item) => item.productType === productType.DIGITAL)

      const physicalItems = orderItems.filter((item) => item.productType === productType.PHYSICAL)

      // 1. Digital products can only have quantity = 1
      digitalItems.forEach((item, index) => {
        if (item.quantity > 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['orderItems', index, 'quantity'],
            message: 'Digital products can only be purchased with a quantity of 1.',
          })
        }
      })

      // 2. If all products are digital, shipping type is not required
      const allDigital = orderItems.length > 0 && physicalItems.length === 0

      if (allDigital && shippingType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shippingType'],
          message: 'Shipping type is not applicable when all ordered products are digital.',
        })
      }

      // Optional: If there is any physical product, shipping type becomes required.
      if (physicalItems.length > 0 && !shippingType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shippingType'],
          message: 'Shipping type is required for physical products.',
        })
      }

      const productMap = new Map<string, number>()

      orderItems.forEach(({ product }, index) => {
        if (productMap.has(product)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['orderItems', index, 'quantity'],
            message: 'Duplicate product found in order items.',
          })
        }

        productMap.set(product, index)
      })
    }),
})

const previewOrderSchema = z.object({
  body: z
    .object({
      campaignId: requiredMongooseId('Campaign ID'),
      shippingType: enumString(shippingTypesValues, 'Shipping type').optional(),

      // Product:
      orderItems: z
        .array(orderItemSchema, {
          error: 'Order items should be an array of product & quantity.',
        })
        .min(1, {
          error: 'Min. one order item required!',
        }),
    })
    .superRefine((data, ctx) => {
      const { orderItems, shippingType } = data

      const digitalItems = orderItems.filter((item) => item.productType === productType.DIGITAL)

      const physicalItems = orderItems.filter((item) => item.productType === productType.PHYSICAL)

      // 1. Digital products can only have quantity = 1
      digitalItems.forEach((item, index) => {
        if (item.quantity > 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['orderItems', index, 'quantity'],
            message: 'Digital products can only be purchased with a quantity of 1.',
          })
        }
      })

      // 2. If all products are digital, shipping type is not required
      const allDigital = orderItems.length > 0 && physicalItems.length === 0

      if (allDigital && shippingType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shippingType'],
          message: 'Shipping type is not applicable when all ordered products are digital.',
        })
      }

      // Optional: If there is any physical product, shipping type becomes required.
      if (physicalItems.length > 0 && !shippingType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shippingType'],
          message: 'Shipping type is required for physical products.',
        })
      }

      const productMap = new Map<string, number>()

      orderItems.forEach(({ product }, index) => {
        if (productMap.has(product)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['orderItems', index, 'quantity'],
            message: 'Duplicate product found in order items.',
          })
        }

        productMap.set(product, index)
      })
    }),
})
const updateOrderSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllOrderSchema = z.object({
  query: z.object({
    campaignId: requiredMongooseId('Campaign ID'),
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(orderSortableFields, 'Sort by'),
    orderStatus: optionalEnumString(OrderStatusValues, 'Order Status'),
    paymentStatus: optionalEnumString(paymentStatusValues, 'Payment Status'),
    skipPagination: z.coerce
      .boolean({
        error: 'skip pagination should be boolean',
      })
      .default(false)
      .optional(),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getOrderByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteOrderByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const orderValidations = {
  createOrderSchema,
  previewOrderSchema,
  updateOrderSchema,
  getAllOrderSchema,
  getOrderByIdSchema,
  deleteOrderByIdSchema,
}

export type TCreateOrderPayloadType = z.infer<typeof createOrderSchema.shape.body>
export type TPreviewOrderPayloadType = z.infer<typeof previewOrderSchema.shape.body>
export type TUpdateOrderPayloadType = z.infer<typeof updateOrderSchema.shape.body>
export type TGetAllOrderQueryParamsType = z.infer<typeof getAllOrderSchema.shape.query>
export type TGetOrderByIdParamsType = z.infer<typeof getOrderByIdSchema.shape.params>
export type TDeleteOrderByIdParamsType = z.infer<typeof deleteOrderByIdSchema.shape.params>
