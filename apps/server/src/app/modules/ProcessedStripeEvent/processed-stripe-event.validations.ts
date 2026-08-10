import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { processedStripeEventSortableFields } from "@repo/db"



const createProcessedStripeEventSchema = z.object({
  body: z.object({})
})

const updateProcessedStripeEventSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllProcessedStripeEventSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(processedStripeEventSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getProcessedStripeEventByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deleteProcessedStripeEventByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const processedStripeEventValidations = {
  createProcessedStripeEventSchema,
  updateProcessedStripeEventSchema,
  getAllProcessedStripeEventSchema,
  getProcessedStripeEventByIdSchema,
  deleteProcessedStripeEventByIdSchema
}

export type TCreateProcessedStripeEventPayloadType = z.infer<typeof createProcessedStripeEventSchema.shape.body>
export type TUpdateProcessedStripeEventPayloadType = z.infer<typeof updateProcessedStripeEventSchema.shape.body>
export type TGetAllProcessedStripeEventQueryParamsType = z.infer<typeof getAllProcessedStripeEventSchema.shape.query>
export type TGetProcessedStripeEventByIdParamsType = z.infer<typeof getProcessedStripeEventByIdSchema.shape.params>
export type TDeleteProcessedStripeEventByIdParamsType = z.infer<typeof deleteProcessedStripeEventByIdSchema.shape.params>