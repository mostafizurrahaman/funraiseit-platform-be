import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredMongooseId,
} from '@repo/shared'
import { supportSortableFields, supportStatusValues } from '@repo/db'

const createSupportSchema = z.object({
  body: z.object({
    campaign: requiredMongooseId('Campaign').optional(),
    email: requiredString('Email'),
    subject: requiredString('Subject'),
    message: requiredString('Message'),
  }),
})

const replySupportMessageSchema = z.object({
  body: z.object({
    supportId: requiredMongooseId('Support Id'),
    replyMessage: requiredString('Reply message'),
  }),
})

const getAllSupportSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(supportSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
    status: optionalEnumString(supportStatusValues, 'Status'),
  }),
})

const getSupportByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteSupportByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const updateSupportStatusSchema = z.object({
  params: z.object({
    id: requiredMongooseId('Support ID'),
  }),
})

export const supportValidations = {
  createSupportSchema,
  replySupportMessageSchema,
  getAllSupportSchema,
  getSupportByIdSchema,
  deleteSupportByIdSchema,
  updateSupportStatusSchema,
}

export type TCreateSupportPayloadType = z.infer<typeof createSupportSchema.shape.body>
export type TReplySupportMessagePayloadType = z.infer<typeof replySupportMessageSchema.shape.body>
export type TGetAllSupportQueryParamsType = z.infer<typeof getAllSupportSchema.shape.query>
export type TGetSupportByIdParamsType = z.infer<typeof getSupportByIdSchema.shape.params>
export type TDeleteSupportByIdParamsType = z.infer<typeof deleteSupportByIdSchema.shape.params>
