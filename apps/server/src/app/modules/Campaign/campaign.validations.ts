import { campaignCategoryValues } from './../../../../../../packages/db/src/apps/modules/Campaign/campaign.constants'
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
  requiredStrBoolean,
  requiredMongooseId,
} from '@repo/shared'
import {
  AuthStatusValues,
  campaignCategoryValues,
  campaignSortableFields,
  campaignStatusValues,
} from '@repo/db'

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
      allowLocalPickup: requiredStrBoolean('Allow local pickup'),
      allowLocalDelivery: requiredStrBoolean('Allow local delivery'),
      allowShipping: requiredStrBoolean('Allow shipping'),
      allowDonation: requiredStrBoolean('Allow donation'),
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

      if (!data.allowShipping && data.shippingFee > 0) {
        return ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['allowShipping'],
          message: 'Shipping fee cannot be added when shipping is disabled.',
        })
      }
    }),
})

const getCampaignPreviewByID = z.object({
  params: z.object({
    id: requiredMongooseId('Campaign ID'),
  }),
  body: z.object({
    promoCode: optionalString('Promo Code'),
  }),
})

const launchCampaignByID = z.object({
  params: z.object({
    id: requiredMongooseId('Campaign ID'),
  }),
  body: z.object({
    promoCode: optionalString('Promo Code'),
  }),
})

const updateCampaignSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({
    name: optionalString('Name'),
    campaignCategory: optionalEnumString(campaignCategoryValues, 'Campaign category'),
    story: optionalString('Story'),
    fundUsage: z
      .array(optionalString('fundUsage'), {
        error: 'Fund usage should be an array of string',
      })
      .min(1, {
        error: 'min. one item is required!',
      })
      .optional(),
    goalAmount: positiveNumber('Goal amount').optional(),
    durationDays: positiveNumber('Days')
      .max(30, {
        error: 'Duration days max. 7 days.',
      })
      .min(1, {
        error: 'Duration days min. 1 days',
      })
      .optional(),
    allowLocalPickup: requiredStrBoolean('Allow local pickup').optional(),
    allowLocalDelivery: requiredStrBoolean('Allow local delivery').optional(),
    allowShipping: requiredStrBoolean('Allow shipping').optional(),
    allowDonation: requiredStrBoolean('Allow donation').optional(),
    shippingFee: positiveNumber('Shipping fee').optional(),
  }),
})

const getAllCampaignSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    organizerId: requiredMongooseId('Organizer ID').optional(),
    campaignStatus: optionalEnumString(campaignStatusValues, 'Campaign Status'),
    organizerStatus: optionalEnumString(AuthStatusValues, 'Organizer Status'),
    campaignCategory: optionalEnumString(campaignCategoryValues, 'Campaign category'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(campaignSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getMyAllCampaignSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    campaignStatus: optionalEnumString(campaignStatusValues, 'Campaign Status'),
    campaignCategory: optionalEnumString(campaignCategoryValues, 'Campaign category'),

    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(campaignSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getAllActiveCampaign = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    organizerId: requiredMongooseId('Organizer ID').optional(),
    campaignCategory: optionalEnumString(campaignCategoryValues, 'Campaign category'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(campaignSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getCampaignByIdSchema = z.object({
  params: z.object({
    id: requiredMongooseId('ID'),
  }),
})

const getCampaignByCampaignCodeSchema = z.object({
  params: z.object({
    code: requiredString('Code ID'),
  }),
})

const deleteCampaignByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const earlyCompletedCampaignById = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const campaignValidations = {
  createCampaignSchema,
  updateCampaignSchema,
  getAllCampaignSchema,
  getCampaignByIdSchema,
  getCampaignByCampaignCodeSchema,
  deleteCampaignByIdSchema,
  getCampaignPreviewByID,
  launchCampaignByID,
  getAllActiveCampaign,
  getMyAllCampaignSchema,
  earlyCompletedCampaignById,
}

export type TCreateCampaignPayloadType = z.infer<typeof createCampaignSchema.shape.body>
export type TUpdateCampaignPayloadType = z.infer<typeof updateCampaignSchema.shape.body>
export type TGetAllCampaignQueryParamsType = z.infer<typeof getAllCampaignSchema.shape.query>
export type TGetMyAllCampaignQueryParamsType = z.infer<typeof getMyAllCampaignSchema.shape.query>
export type TGetCampaignByIdParamsType = z.infer<typeof getCampaignByIdSchema.shape.params>
export type TDeleteCampaignByIdParamsType = z.infer<typeof deleteCampaignByIdSchema.shape.params>

export type TGetCampaignPreviewByID = z.infer<typeof getCampaignPreviewByID.shape.body>
export type TLaunchCampaignPayloadType = z.infer<typeof launchCampaignByID.shape.body>
export type TGetAllActiveCampaignQuery = z.infer<typeof getAllActiveCampaign.shape.query>
