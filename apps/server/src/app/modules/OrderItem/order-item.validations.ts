import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { orderItemSortableFields } from "@repo/db"



const createOrderItemSchema = z.object({
  body: z.object({})
})

const updateOrderItemSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllOrderItemSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(orderItemSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getOrderItemByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deleteOrderItemByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const orderItemValidations = {
  createOrderItemSchema,
  updateOrderItemSchema,
  getAllOrderItemSchema,
  getOrderItemByIdSchema,
  deleteOrderItemByIdSchema
}

export type TCreateOrderItemPayloadType = z.infer<typeof createOrderItemSchema.shape.body>
export type TUpdateOrderItemPayloadType = z.infer<typeof updateOrderItemSchema.shape.body>
export type TGetAllOrderItemQueryParamsType = z.infer<typeof getAllOrderItemSchema.shape.query>
export type TGetOrderItemByIdParamsType = z.infer<typeof getOrderItemByIdSchema.shape.params>
export type TDeleteOrderItemByIdParamsType = z.infer<typeof deleteOrderItemByIdSchema.shape.params>