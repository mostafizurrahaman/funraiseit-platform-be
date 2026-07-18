import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { campaignSortableFields } from "@repo/db"



const createCampaignSchema = z.object({
  body: z.object({})
})

const updateCampaignSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllCampaignSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(campaignSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getCampaignByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deleteCampaignByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const campaignValidations = {
  createCampaignSchema,
  updateCampaignSchema,
  getAllCampaignSchema,
  getCampaignByIdSchema,
  deleteCampaignByIdSchema
}

export type TCreateCampaignPayloadType = z.infer<typeof createCampaignSchema.shape.body>
export type TUpdateCampaignPayloadType = z.infer<typeof updateCampaignSchema.shape.body>
export type TGetAllCampaignQueryParamsType = z.infer<typeof getAllCampaignSchema.shape.query>
export type TGetCampaignByIdParamsType = z.infer<typeof getCampaignByIdSchema.shape.params>
export type TDeleteCampaignByIdParamsType = z.infer<typeof deleteCampaignByIdSchema.shape.params>