import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredEmail,
  usaPhoneRegex,
  requiredMongooseId,
  positiveNumber,
} from '@repo/shared'

const createDonationSchema = z.object({
  body: z.object({
    campaignId: requiredMongooseId('Campaign ID'),
    firstName: requiredString('First name'),
    lastName: requiredString('Last name'),
    message: requiredString('Message'),
    email: requiredEmail('Email'),
    phone: requiredString('Phone').regex(usaPhoneRegex, 'Phone number should be valid usa number.'),
    amount: positiveNumber('amount').min(0.5, {
      error: 'Amount must be at least $0.50.',
    }),
  }),
})

const updateDonationSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllDonationSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(donationSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getDonationByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteDonationByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const donationValidations = {
  createDonationSchema,
  updateDonationSchema,
  getAllDonationSchema,
  getDonationByIdSchema,
  deleteDonationByIdSchema,
}

export type TCreateDonationPayloadType = z.infer<typeof createDonationSchema.shape.body>
export type TUpdateDonationPayloadType = z.infer<typeof updateDonationSchema.shape.body>
export type TGetAllDonationQueryParamsType = z.infer<typeof getAllDonationSchema.shape.query>
export type TGetDonationByIdParamsType = z.infer<typeof getDonationByIdSchema.shape.params>
export type TDeleteDonationByIdParamsType = z.infer<typeof deleteDonationByIdSchema.shape.params>
