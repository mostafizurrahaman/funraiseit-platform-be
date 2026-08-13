// import { supporterSortableFields } from '@repo/db'
import z from 'zod'
import {
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredMongooseId,
} from '@repo/shared'

const getAllSupporterSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    campaignId: requiredMongooseId('Campaign ID'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString([], 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getSupporterOverviewByID = z.object({
  query: z.object({
    campaignId: requiredMongooseId('Campaign ID'),
  }),
})

const sendEmailToSupporterSchema = z.object({
  body: z.object({
    campaignId: requiredMongooseId('Campaign ID'),
    subject: z.string({
      error: 'Subject is required.',
    }),
    message: z.string({
      error: 'Email message is required.',
    }),
  }),
})

export const supporterValidations = {
  getAllSupporterSchema,
  getSupporterOverviewByID,
  sendEmailToSupporterSchema,
}

export type TGetAllSupporterQueryParamsType = z.infer<typeof getAllSupporterSchema.shape.query>

export type TGetSupporterOverviewByCampaignIdQuery = z.infer<
  typeof getSupporterOverviewByID.shape.query
>

export type TSendEmailToSupporterPayload = z.infer<typeof sendEmailToSupporterSchema.shape.body>
