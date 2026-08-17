import z from 'zod'
import {
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredEmail,
} from '@repo/shared'
import { newsLetterSortableFields } from '@repo/db'

const createNewsLetterSchema = z.object({
  body: z.object({
    email: requiredEmail('Email'),
  }),
})

const getAllNewsLetterSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(newsLetterSortableFields, 'Sort by'),
    skipPagination: z.boolean({ error: 'Skip pagination is required.' }).optional(),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

export const newsLetterValidations = {
  createNewsLetterSchema,

  getAllNewsLetterSchema,
}

export type TCreateNewsLetterPayloadType = z.infer<typeof createNewsLetterSchema.shape.body>
export type TGetAllNewsLetterQueryParamsType = z.infer<typeof getAllNewsLetterSchema.shape.query>
