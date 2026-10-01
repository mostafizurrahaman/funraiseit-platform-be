import z from 'zod'
import {
  requiredEmail,
  optionalNumber,
  optionalString,
  optionalDate,
  optionalEnumString,
  sortingOrderValues,
  usaPhoneRegex,
} from '@repo/shared'
import { waitlistSortableFields, waitlistStatusValues } from '@repo/db'

const submitEmailSchema = z.object({
  body: z.object({
    email: requiredEmail('Email'),
  }),
})

const claimVipSchema = z.object({
  body: z.object({
    email: requiredEmail('Email'),
    phoneNumber: z
      .string({
        error: 'Phone number is required.',
      })
      .trim()
      .regex(usaPhoneRegex, 'Please enter a valid USA phone number.'),
  }),
})

const skipVipSchema = z.object({
  body: z.object({
    email: requiredEmail('Email'),
  }),
})

const booleanPreprocessor = (val: unknown) => {
  if (val === 'true' || val === true) return true
  if (val === 'false' || val === false) return false
  return undefined
}

const getAllWaitlistSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    status: optionalEnumString(waitlistStatusValues, 'Status'),
    isVip: z.preprocess(booleanPreprocessor, z.boolean().optional()),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(waitlistSortableFields, 'Sort by'),
    skipPagination: z.preprocess(booleanPreprocessor, z.boolean().optional()),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const exportWaitlistSchema = z.object({
  query: z.object({
    searchTerm: optionalString('Search term'),
    status: optionalEnumString(waitlistStatusValues, 'Status'),
    isVip: z.preprocess(booleanPreprocessor, z.boolean().optional()),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(waitlistSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
    format: z.enum(['csv', 'excel', 'xlsx', 'json']).optional(),
  }),
})

export const waitlistValidations = {
  submitEmailSchema,
  claimVipSchema,
  skipVipSchema,
  getAllWaitlistSchema,
  exportWaitlistSchema,
}

export type TSubmitEmailPayload = z.infer<typeof submitEmailSchema.shape.body>
export type TClaimVipPayload = z.infer<typeof claimVipSchema.shape.body>
export type TSkipVipPayload = z.infer<typeof skipVipSchema.shape.body>
export type TGetAllWaitlistQuery = z.infer<typeof getAllWaitlistSchema.shape.query>
export type TExportWaitlistQuery = z.infer<typeof exportWaitlistSchema.shape.query>
