import { campaignStatusValues } from './../../../../../../packages/db/src/apps/modules/Campaign/campaign.constants'
import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  positiveNumber,
  enumString,
  requiredMongooseId,
} from '@repo/shared'
import { productSortableFields, productType, productTypeValues } from 'packages/db/src'

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

const updateProductIntoCampaignSchema = z.object({
  params: z.object({
    productId: requiredMongooseId('Product ID'),
  }),

  body: z
    .object({
      name: optionalString('Name'),
      description: optionalString('Description'),
      price: positiveNumber('Price').optional(),

      // Optional because product type cannot be changed.
      // Used only for validation if client sends it.
      productType: optionalEnumString(productTypeValues, 'Product type'),

      stock: positiveNumber('Stock').nullable().optional(),
      sku: optionalString('SKU'),
      weight: optionalNumber('Weight'),

      downloadFileName: optionalString('Download file name'),
    })
    .superRefine((data, ctx) => {
      // If somehow digital is sent, require file name
      if (data.productType === productType.DIGITAL && !data.downloadFileName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['downloadFileName'],
          message: 'Download file name is required for digital products.',
        })
      }
    }),
})

const getAllProductSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    campaignId: optionalString('Campaign ID'),
    campaignStatus: optionalEnumString(campaignStatusValues, 'Campaign Status'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(productSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getProductByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteProductByIdSchema = z.object({
  params: z.object({
    productId: requiredString('product ID'),
  }),
})

export const productValidations = {
  addProductIntoCampaignSchema,
  updateProductIntoCampaignSchema,
  getAllProductSchema,
  getProductByIdSchema,
  deleteProductByIdSchema,
}

export type TGetAllProductQueryParamsType = z.infer<typeof getAllProductSchema.shape.query>
export type TGetProductByIdParamsType = z.infer<typeof getProductByIdSchema.shape.params>
export type TDeleteProductByIdParamsType = z.infer<typeof deleteProductByIdSchema.shape.params>
export type TAddProductIntoCampaignPayload = z.infer<typeof addProductIntoCampaignSchema.shape.body>
export type TUpdateProductIntoCampaignPayload = z.infer<
  typeof updateProductIntoCampaignSchema.shape.body
>
