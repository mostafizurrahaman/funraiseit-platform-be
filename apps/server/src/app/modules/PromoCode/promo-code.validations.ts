import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  sortOrder,
  enumString,
  positiveNumber,
  requiredDate,
  requiredMongooseId,
} from '@repo/shared'
import { discountType, discountTypeValues, promoCodeSortableFields } from '@repo/db'

const createPromoCodeSchema = z.object({
  body: z
    .object({
      code: requiredString('Code').toUpperCase(),
      discountType: enumString(discountTypeValues, 'Discount type'),
      discountValue: positiveNumber('Discount value').min(1, {
        error: 'Discount value must be at least 1 or 1%.',
      }),
      usageLimit: positiveNumber('Usage limit'),
      expiresAt: requiredDate('Expires at'),
    })
    .superRefine((data, ctx) => {
      if (data.discountType === discountType.PERCENTAGE && data.discountValue > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['discountValue'],
          message: 'Discount percentage cannot exceed 100%.',
        })
      }

      if (data.expiresAt.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiresAt'],
          message: 'Expiration date must be in the future.',
        })
      }
    }),
})

const updatePromoCodeSchema = z.object({
  params: z.object({
    id: requiredMongooseId('PromoCode ID'),
  }),
  body: z
    .object({
      code: optionalString('Code').transform((val) => val?.toUpperCase()),
      discountType: optionalEnumString(discountTypeValues, 'Discount type'),
      discountValue: positiveNumber('Discount value')
        .min(1, {
          error: 'Discount value must be at least 1 or 1%.',
        })
        .optional(),
      usageLimit: positiveNumber('Usage limit').optional(),
      isActive: z
        .boolean({
          error: 'isActive must be boolean',
        })
        .optional(),
      expiresAt: requiredDate('Expires at').optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.discountType === discountType.PERCENTAGE &&
        data.discountValue &&
        data.discountValue > 100
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['discountValue'],
          message: 'Discount percentage cannot exceed 100%.',
        })
      }

      if (data.expiresAt && data.expiresAt.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiresAt'],
          message: 'Expiration date must be in the future.',
        })
      }
    }),
})

const getAllPromoCodeSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(promoCodeSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getPromoCodeByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deletePromoCodeByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const promoCodeValidations = {
  createPromoCodeSchema,
  updatePromoCodeSchema,
  getAllPromoCodeSchema,
  getPromoCodeByIdSchema,
  deletePromoCodeByIdSchema,
}

export type TCreatePromoCodePayloadType = z.infer<typeof createPromoCodeSchema.shape.body>
export type TGetAllPromoCodeQueryParamsType = z.infer<typeof getAllPromoCodeSchema.shape.query>
export type TGetPromoCodeByIdParamsType = z.infer<typeof getPromoCodeByIdSchema.shape.params>
export type TDeletePromoCodeByIdParamsType = z.infer<typeof deletePromoCodeByIdSchema.shape.params>
