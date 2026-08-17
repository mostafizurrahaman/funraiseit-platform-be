import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { supportReplySortableFields } from "@repo/db"



const createSupportReplySchema = z.object({
  body: z.object({})
})

const updateSupportReplySchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllSupportReplySchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(supportReplySortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getSupportReplyByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deleteSupportReplyByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const supportReplyValidations = {
  createSupportReplySchema,
  updateSupportReplySchema,
  getAllSupportReplySchema,
  getSupportReplyByIdSchema,
  deleteSupportReplyByIdSchema
}

export type TCreateSupportReplyPayloadType = z.infer<typeof createSupportReplySchema.shape.body>
export type TUpdateSupportReplyPayloadType = z.infer<typeof updateSupportReplySchema.shape.body>
export type TGetAllSupportReplyQueryParamsType = z.infer<typeof getAllSupportReplySchema.shape.query>
export type TGetSupportReplyByIdParamsType = z.infer<typeof getSupportReplyByIdSchema.shape.params>
export type TDeleteSupportReplyByIdParamsType = z.infer<typeof deleteSupportReplyByIdSchema.shape.params>