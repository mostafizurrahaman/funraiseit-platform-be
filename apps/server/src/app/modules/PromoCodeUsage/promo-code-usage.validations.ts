import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { promoCodeUsageSortableFields } from "@repo/db"



const createPromoCodeUsageSchema = z.object({
  body: z.object({})
})

const updatePromoCodeUsageSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllPromoCodeUsageSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(promoCodeUsageSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getPromoCodeUsageByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deletePromoCodeUsageByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const promoCodeUsageValidations = {
  createPromoCodeUsageSchema,
  updatePromoCodeUsageSchema,
  getAllPromoCodeUsageSchema,
  getPromoCodeUsageByIdSchema,
  deletePromoCodeUsageByIdSchema
}

export type TCreatePromoCodeUsagePayloadType = z.infer<typeof createPromoCodeUsageSchema.shape.body>
export type TUpdatePromoCodeUsagePayloadType = z.infer<typeof updatePromoCodeUsageSchema.shape.body>
export type TGetAllPromoCodeUsageQueryParamsType = z.infer<typeof getAllPromoCodeUsageSchema.shape.query>
export type TGetPromoCodeUsageByIdParamsType = z.infer<typeof getPromoCodeUsageByIdSchema.shape.params>
export type TDeletePromoCodeUsageByIdParamsType = z.infer<typeof deletePromoCodeUsageByIdSchema.shape.params>