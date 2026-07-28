import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { supporterSortableFields } from "@repo/db"



const createSupporterSchema = z.object({
  body: z.object({})
})

const updateSupporterSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllSupporterSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(supporterSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getSupporterByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deleteSupporterByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const supporterValidations = {
  createSupporterSchema,
  updateSupporterSchema,
  getAllSupporterSchema,
  getSupporterByIdSchema,
  deleteSupporterByIdSchema
}

export type TCreateSupporterPayloadType = z.infer<typeof createSupporterSchema.shape.body>
export type TUpdateSupporterPayloadType = z.infer<typeof updateSupporterSchema.shape.body>
export type TGetAllSupporterQueryParamsType = z.infer<typeof getAllSupporterSchema.shape.query>
export type TGetSupporterByIdParamsType = z.infer<typeof getSupporterByIdSchema.shape.params>
export type TDeleteSupporterByIdParamsType = z.infer<typeof deleteSupporterByIdSchema.shape.params>