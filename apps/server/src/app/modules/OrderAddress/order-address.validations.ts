import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  sortOrder,
} from '@repo/shared'
import { orderAddressSortableFields } from '@repo/db'

const createOrderAddressSchema = z.object({
  body: z.object({}),
})

const updateOrderAddressSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllOrderAddressSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(orderAddressSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getOrderAddressByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteOrderAddressByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const orderAddressValidations = {
  createOrderAddressSchema,
  updateOrderAddressSchema,
  getAllOrderAddressSchema,
  getOrderAddressByIdSchema,
  deleteOrderAddressByIdSchema,
}

export type TCreateOrderAddressPayloadType = z.infer<typeof createOrderAddressSchema.shape.body>
export type TUpdateOrderAddressPayloadType = z.infer<typeof updateOrderAddressSchema.shape.body>
export type TGetAllOrderAddressQueryParamsType = z.infer<
  typeof getAllOrderAddressSchema.shape.query
>
export type TGetOrderAddressByIdParamsType = z.infer<typeof getOrderAddressByIdSchema.shape.params>
export type TDeleteOrderAddressByIdParamsType = z.infer<
  typeof deleteOrderAddressByIdSchema.shape.params
>
