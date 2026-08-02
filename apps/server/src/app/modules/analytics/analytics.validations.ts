import { requiredDate, requiredMongooseId } from 'packages/shared/src'
import z from 'zod'

const getAnalyticsOverview = z.object({
  query: z.object({
    campaignId: requiredMongooseId('Campaign ID'),
    fromDate: requiredDate('From date').optional(),
    toDate: requiredDate('To date').optional(),
  }),
})

export const analyticsValidation = {
  getAnalyticsOverview,
}

export type TGetAnalyticsOverview = z.infer<typeof getAnalyticsOverview.shape.query>
