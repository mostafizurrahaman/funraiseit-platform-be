import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { payoutSortableFields } from "@repo/db"



const createPayoutSchema = z.object({
  body: z.object({})
})

const updatePayoutSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllPayoutSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(payoutSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getPayoutByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deletePayoutByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const payoutValidations = {
  createPayoutSchema,
  updatePayoutSchema,
  getAllPayoutSchema,
  getPayoutByIdSchema,
  deletePayoutByIdSchema
}

export type TCreatePayoutPayloadType = z.infer<typeof createPayoutSchema.shape.body>
export type TUpdatePayoutPayloadType = z.infer<typeof updatePayoutSchema.shape.body>
export type TGetAllPayoutQueryParamsType = z.infer<typeof getAllPayoutSchema.shape.query>
export type TGetPayoutByIdParamsType = z.infer<typeof getPayoutByIdSchema.shape.params>
export type TDeletePayoutByIdParamsType = z.infer<typeof deletePayoutByIdSchema.shape.params>