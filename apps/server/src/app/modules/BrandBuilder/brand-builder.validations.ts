import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredMongooseId,
} from '@repo/shared'
import { brandBuilderSortableFields, brandBuilderStatusValues } from '@repo/db'

const createBrandBuilderSchema = z.object({
  body: z.object({
    products: z
      .array(requiredString('Product'), {
        error: 'Product should be an array of string',
      })
      .min(1, {
        error: 'Min. one product required.',
      }),
    businessName: requiredString('Business Name'),
    sellingItem: requiredString('Selling item'),
    colors: z
      .array(
        z.string().regex(/^#[A-Fa-f0-9]{6}$/, 'Invalid color code. Use a valid HEX color code.'),
        {
          error: 'Colors should be an array of valid HEX color codes',
        }
      )
      .min(1, {
        error: 'Min. one color required.',
      }),
    brandStyle: requiredString('Brand style'),
    budget: requiredString('Budget'),
  }),
})

const updateBrandBuilderSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllBrandBuilderSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    organizerId: requiredMongooseId('Organizer ID').optional(),
    status: optionalEnumString(brandBuilderStatusValues, 'Brand status'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(brandBuilderSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getCustomerAllBrandBuilderSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    status: optionalEnumString(brandBuilderStatusValues, 'Brand status'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(brandBuilderSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getBrandBuilderByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteBrandBuilderByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const brandBuilderValidations = {
  createBrandBuilderSchema,
  updateBrandBuilderSchema,
  getAllBrandBuilderSchema,
  getBrandBuilderByIdSchema,
  deleteBrandBuilderByIdSchema,
  getCustomerAllBrandBuilderSchema,
}

export type TCreateBrandBuilderPayloadType = z.infer<typeof createBrandBuilderSchema.shape.body>
export type TUpdateBrandBuilderPayloadType = z.infer<typeof updateBrandBuilderSchema.shape.body>
export type TGetAllBrandBuilderQueryParamsType = z.infer<
  typeof getAllBrandBuilderSchema.shape.query
>
export type TGetCustomerAllBrandBuilderQueryParamsType = z.infer<
  typeof getCustomerAllBrandBuilderSchema.shape.query
>
export type TGetBrandBuilderByIdParamsType = z.infer<typeof getBrandBuilderByIdSchema.shape.params>
export type TDeleteBrandBuilderByIdParamsType = z.infer<
  typeof deleteBrandBuilderByIdSchema.shape.params
>
