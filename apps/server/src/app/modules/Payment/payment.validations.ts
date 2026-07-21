import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { paymentSortableFields } from "@repo/db"



const createPaymentSchema = z.object({
  body: z.object({})
})

const updatePaymentSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllPaymentSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(paymentSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getPaymentByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deletePaymentByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const paymentValidations = {
  createPaymentSchema,
  updatePaymentSchema,
  getAllPaymentSchema,
  getPaymentByIdSchema,
  deletePaymentByIdSchema
}

export type TCreatePaymentPayloadType = z.infer<typeof createPaymentSchema.shape.body>
export type TUpdatePaymentPayloadType = z.infer<typeof updatePaymentSchema.shape.body>
export type TGetAllPaymentQueryParamsType = z.infer<typeof getAllPaymentSchema.shape.query>
export type TGetPaymentByIdParamsType = z.infer<typeof getPaymentByIdSchema.shape.params>
export type TDeletePaymentByIdParamsType = z.infer<typeof deletePaymentByIdSchema.shape.params>