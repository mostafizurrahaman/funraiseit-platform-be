import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  positiveNumber,
} from '@repo/shared'
import { reviewSortableFields } from '@repo/db'

const createReviewSchema = z.object({
  body: z.object({
    message: requiredString('Message'),
    rating: positiveNumber('Rating')
      .min(1, { error: 'Rating must be at least 1.' })
      .max(5, { error: 'Rating cannot exceed 5.' }),
  }),
})

const toggleIsFeatured = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const getAllReviewSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(reviewSortableFields, 'Sort by'),
    isFeatured: z.coerce.boolean({ error: 'Is featured should be boolean' }),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getReviewByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteReviewByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const reviewValidations = {
  createReviewSchema,
  toggleIsFeatured,
  getAllReviewSchema,
  getReviewByIdSchema,
  deleteReviewByIdSchema,
}

export type TCreateReviewPayloadType = z.infer<typeof createReviewSchema.shape.body>
export type TToggleIsFeaturedType = z.infer<typeof toggleIsFeatured.shape.params>
export type TGetAllReviewQueryParamsType = z.infer<typeof getAllReviewSchema.shape.query>
export type TGetReviewByIdParamsType = z.infer<typeof getReviewByIdSchema.shape.params>
export type TDeleteReviewByIdParamsType = z.infer<typeof deleteReviewByIdSchema.shape.params>
