import z from 'zod'
import {
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredMongooseId,
} from '@repo/shared'
import { paymentSortableFields, paymentStatusValues, paymentTypeValues } from '@repo/db'

const getAllPaymentSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(paymentSortableFields, 'Sort by'),
    paymentType: optionalEnumString(paymentTypeValues, 'Payment type'),
    paymentStatus: optionalEnumString(paymentStatusValues, 'Payment status'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
    campaignId: requiredMongooseId('Campaign ID').optional(),
    organizerId: requiredMongooseId('Organizer ID').optional(),
  }),
})

export const paymentValidations = {
  getAllPaymentSchema,
}

export type TGetAllPaymentQueryParamsType = z.infer<typeof getAllPaymentSchema.shape.query>
