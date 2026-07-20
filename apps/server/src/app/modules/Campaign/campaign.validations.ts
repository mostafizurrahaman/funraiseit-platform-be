import z from 'zod'
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  sortingOrderValues,
  enumString,
  positiveNumber,
} from '@repo/shared'
import { campaignCategoryValues, campaignSortableFields } from '@repo/db'

const createCampaignSchema = z.object({
  body: z
    .object({
      name: requiredString('Name'),
      campaignCategory: enumString(campaignCategoryValues, 'Campaign category'),
      story: requiredString('Story'),
      fundUsage: z
        .array(requiredString('fundUsage'), {
          error: 'Fund usage should be an array of string',
        })
        .min(1, {
          error: 'min. one item is required!',
        }),
      goalAmount: positiveNumber('Goal amount'),
      durationDays: positiveNumber('Days')
        .max(30, {
          error: 'Duration days max. 7 days.',
        })
        .min(1, {
          error: 'Duration days min. 1 days',
        }),
      allowLocalPickup: z.coerce
        .boolean({
          error: 'Allow local pickup should be boolean!',
        })
        .default(false),
      allowLocalDelivery: z.coerce
        .boolean({
          error: 'Allow local delivery should be boolean!',
        })
        .default(false),
      allowShipping: z.coerce
        .boolean({
          error: 'Allow shipping method should be boolean!',
        })
        .default(false),
      allowDonation: z.coerce
        .boolean({
          error: 'Allow shipping method should be boolean!',
        })
        .default(false),
      promoCode: requiredString('Promo Code'),
      shippingFee: positiveNumber('Shipping fee'),
    })
    .superRefine((data, ctx) => {
      if (!data.allowLocalPickup && !data.allowLocalDelivery && !data.allowShipping) {
        return ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['allowLocalPickup'],
          message:
            'At least one option must be enabled (Local Pickup, Local Delivery, Shipping, or Donation).',
        })
      }

      if (data.allowShipping && !data.shippingFee) {
        return ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['allowShipping'],
          message: 'Shipping fee is required!',
        })
      }
    }),
})

const updateCampaignSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllCampaignSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(campaignSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getCampaignByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteCampaignByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const campaignValidations = {
  createCampaignSchema,
  updateCampaignSchema,
  getAllCampaignSchema,
  getCampaignByIdSchema,
  deleteCampaignByIdSchema,
}

export type TCreateCampaignPayloadType = z.infer<typeof createCampaignSchema.shape.body>
export type TUpdateCampaignPayloadType = z.infer<typeof updateCampaignSchema.shape.body>
export type TGetAllCampaignQueryParamsType = z.infer<typeof getAllCampaignSchema.shape.query>
export type TGetCampaignByIdParamsType = z.infer<typeof getCampaignByIdSchema.shape.params>
export type TDeleteCampaignByIdParamsType = z.infer<typeof deleteCampaignByIdSchema.shape.params>
