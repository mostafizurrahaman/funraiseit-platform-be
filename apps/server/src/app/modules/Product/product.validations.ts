import { DigitalProduct } from './../../../../../../packages/db/src/apps/modules/Product/product.model'

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
} from '@repo/shared'
import { productType, productTypeValues } from 'packages/db/src'

const createProductSchema = z.object({
  body: z
    .object({
      name: requiredString('Name'),
      description: optionalString('Description'),
      price: positiveNumber('Price'),
      productType: enumString(productTypeValues, 'Product type'),
      stock: optionalString('Stock').nullable(),
      sku: optionalString('SKU'),
      weight: optionalString('Weight'),
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

const updateProductSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllProductSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
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
    id: requiredString('ID'),
  }),
})

export const productValidations = {
  createProductSchema,
  updateProductSchema,
  getAllProductSchema,
  getProductByIdSchema,
  deleteProductByIdSchema,
}

export type TCreateProductPayloadType = z.infer<typeof createProductSchema.shape.body>
export type TUpdateProductPayloadType = z.infer<typeof updateProductSchema.shape.body>
export type TGetAllProductQueryParamsType = z.infer<typeof getAllProductSchema.shape.query>
export type TGetProductByIdParamsType = z.infer<typeof getProductByIdSchema.shape.params>
export type TDeleteProductByIdParamsType = z.infer<typeof deleteProductByIdSchema.shape.params>
