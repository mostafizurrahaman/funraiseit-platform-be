// import { supporterSortableFields } from '@repo/db'
import z from 'zod'
import mongoose from 'mongoose'
import {
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredMongooseId,
} from '@repo/shared'
import { newsLetterSortableFields } from 'packages/db/src'

const getAllSupporterSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    campaignId: requiredMongooseId('Campaign ID'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(newsLetterSortableFields, 'Sort by'),
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

const sendMessageToSupportersSchema = z.object({
  body: z.object({
    campaignId: z
      .string()
      .trim()
      .refine((val) => !val || mongoose.isValidObjectId(val), {
        message: 'Invalid Campaign ID!',
      })
      .optional(),
    message: z
      .string({
        error: 'Message is required.',
      })
      .trim()
      .min(1, 'Message cannot be empty.'),
  }),
})

export const supporterValidations = {
  getAllSupporterSchema,
  getSupporterOverviewByID,
  sendEmailToSupporterSchema,
  sendMessageToSupportersSchema,
  sendMessageToSupporterSchema: sendMessageToSupportersSchema,
  sendSmsToSupporterSchema: sendMessageToSupportersSchema,
}

export type TGetAllSupporterQueryParamsType = z.infer<typeof getAllSupporterSchema.shape.query>

export type TGetSupporterOverviewByCampaignIdQuery = z.infer<
  typeof getSupporterOverviewByID.shape.query
>

export type TSendEmailToSupporterPayload = z.infer<typeof sendEmailToSupporterSchema.shape.body>

export type TSendMessageToSupportersPayload = z.infer<
  typeof sendMessageToSupportersSchema.shape.body
>

export type TSendMessageToSupporterPayload = TSendMessageToSupportersPayload
