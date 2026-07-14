import { siteInfoSortableFields } from '@repo/db';
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

const createSiteInfoSchema = z.object({
  body: z.object({
    platformFee: positiveNumber('Platform fee')
      .min(0, {
        error: 'Min. Platform fee should 0.',
      })
      .max(100, {
        error: 'Max. Platform fee should be 100',
      }),
    campaignLaunchFee: positiveNumber('Campaign lunch fee'),
    brandBuilderPricing: positiveNumber('Campaign lunch fee'),
  }),
})

const updateSiteInfoSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z.object({}),
})

const getAllSiteInfoSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search term'),
    sortOrder: optionalEnumString(sortingOrderValues, 'Sort order'),
    sortBy: optionalEnumString(siteInfoSortableFields, 'Sort by'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

const getSiteInfoByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

const deleteSiteInfoByIdSchema = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const siteInfoValidations = {
  createSiteInfoSchema,
  updateSiteInfoSchema,
  getAllSiteInfoSchema,
  getSiteInfoByIdSchema,
  deleteSiteInfoByIdSchema,
}

export type TCreateSiteInfoPayloadType = z.infer<typeof createSiteInfoSchema.shape.body>
export type TUpdateSiteInfoPayloadType = z.infer<typeof updateSiteInfoSchema.shape.body>
export type TGetAllSiteInfoQueryParamsType = z.infer<typeof getAllSiteInfoSchema.shape.query>
export type TGetSiteInfoByIdParamsType = z.infer<typeof getSiteInfoByIdSchema.shape.params>
export type TDeleteSiteInfoByIdParamsType = z.infer<typeof deleteSiteInfoByIdSchema.shape.params>
