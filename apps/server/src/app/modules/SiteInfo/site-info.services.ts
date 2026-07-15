import { SiteInfo, type ISiteInfoDoc, type IUser } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'

import type { TCreateSiteInfoPayloadType } from './site-info.validations'

const createSiteInfo = async (user: IUser, payload: TCreateSiteInfoPayloadType) => {
  const { platformFee, campaignLaunchFee, brandBuilderPricing } = payload

  const newPayload: Partial<ISiteInfoDoc> = {
    updatedBy: user?._id,
  }

  if (platformFee !== undefined) newPayload.platformFee = platformFee
  if (campaignLaunchFee !== undefined) newPayload.campaignLaunchFee = campaignLaunchFee
  if (brandBuilderPricing !== undefined) newPayload.brandBuilderPricing = brandBuilderPricing

  const result = await SiteInfo.findOneAndUpdate({}, newPayload, {
    upsert: true,
    new: true,
    runValidators: true,
  })

  return result
}

const getSiteInfo = async () => {
  const result = await SiteInfo.findOne({})

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'SiteInfo not found')
  }

  return result
}

export const siteInfoServices = {
  createSiteInfo,
  getSiteInfo,
}
