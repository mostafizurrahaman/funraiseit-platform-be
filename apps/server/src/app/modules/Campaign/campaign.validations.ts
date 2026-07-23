import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  enumString,
  positiveNumber,
  requiredStrBoolean,
  requiredMongooseId,
} from '@repo/shared'
import {
  campaignCategoryValues,
  campaignSortableFields,
  productType,
  productTypeValues,
} from '@repo/db'

const createCampaignSchema = z.object({
  body: z
    .object({
      name: requiredString('Name'),
      campaignCategory: enumString(campaignCategoryValues, 'Campaign category'),
      story: requiredString('Story'),
      fundUsage: z
        .array(requiredString('fundUsage'), {
          error: 'Fund usage should be an array of string',
        })
        .min(1, {
          error: 'min. one item is required!',
        }),
      goalAmount: positiveNumber('Goal amount'),
      durationDays: positiveNumber('Days')
        .max(30, {
          error: 'Duration days max. 7 days.',
        })
        .min(1, {
          error: 'Duration days min. 1 days',
        }),
      allowLocalPickup: requiredStrBoolean('Allow local pickup'),
      allowLocalDelivery: requiredStrBoolean('Allow local delivery'),
      allowShipping: requiredStrBoolean('Allow shipping'),
      allowDonation: requiredStrBoolean('Allow donation'),
      shippingFee: positiveNumber('Shipping fee'),
    })
    .superRefine((data, ctx) => {
      if (!data.allowLocalPickup && !data.allowLocalDelivery && !data.allowShipping) {
        return ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['allowLocalPickup'],
          message:
            'At least one option must be enabled (Local Pickup, Local Delivery, Shipping, or Donation).',
        })
      }

      if (!data.allowShipping && data.shippingFee > 0) {
        return ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['allowShipping'],
          message: 'Shipping fee cannot be added when shipping is disabled.',
        })
      }
    }),
})

const addProductIntoCampaignSchema = z.object({
  params: z.object({
    id: requiredMongooseId('Campaign ID'),
  }),
  body: z
    .object({
      name: requiredString('Name'),
      description: optionalString('Description'),
      price: positiveNumber('Price'),
      productType: enumString(productTypeValues, 'Product type'),
      stock: positiveNumber('Stock').nullable().optional(),
      sku: optionalString('SKU'),
      weight: optionalNumber('Weight'),
      downloadFileName: optionalString('Download file name'),
    })
    .superRefine((data, ctx) => {
      if (data.productType === productType.DIGITAL && !data.downloadFileName) {
        ctx.addIssue({
          code: 'custom',
          path: ['downloadFileName'],
          message: 'Download File name is required for product type download.',
        })
      }
    }),
})
const getCampaignPreviewByID = z.object({
  params: z.object({
    id: requiredMongooseId('Campaign ID'),
  }),
  body: z.object({
    promoCode: optionalString('Promo Code'),
  }),
})

const updateCampaignSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllCampaignSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(campaignSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getCampaignByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteCampaignByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const campaignValidations = {
  createCampaignSchema,
  addProductIntoCampaignSchema,
  updateCampaignSchema,
  getAllCampaignSchema,
  getCampaignByIdSchema,
  deleteCampaignByIdSchema,
  getCampaignPreviewByID,
}

export type TCreateCampaignPayloadType = z.infer<typeof createCampaignSchema.shape.body>
export type TUpdateCampaignPayloadType = z.infer<typeof updateCampaignSchema.shape.body>
export type TGetAllCampaignQueryParamsType = z.infer<typeof getAllCampaignSchema.shape.query>
export type TGetCampaignByIdParamsType = z.infer<typeof getCampaignByIdSchema.shape.params>
export type TDeleteCampaignByIdParamsType = z.infer<typeof deleteCampaignByIdSchema.shape.params>
export type TAddProductIntoCampaignPayload = z.infer<typeof addProductIntoCampaignSchema.shape.body>
export type TGetCampaignPreviewByID = z.infer<typeof getCampaignPreviewByID.shape.body>
