import z from 'zod'
import {
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  requiredMongooseId,
} from '@repo/shared'
import { payoutSortableFields } from '@repo/db'

const getPayoutOverviewForCampaign = z.object({
  params: z.object({
    campaignId: requiredMongooseId('Campaign ID'),
  }),
})
const getPayoutHistoriesForCampaign = z.object({
  params: z.object({
    campaignId: requiredMongooseId('Campaign ID'),
  }),
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(payoutSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

export const payoutValidations = {
  getPayoutOverviewForCampaign,
  getPayoutHistoriesForCampaign,
}

export type TGetPayoutHistoriesForCampaign = z.infer<
  typeof getPayoutHistoriesForCampaign.shape.query
>
