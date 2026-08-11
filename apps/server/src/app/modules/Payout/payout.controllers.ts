import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { payoutServices } from './payout.services'

import { getUserFromRequest } from '@app/libs/get-user-from-request'
import type { TGetPayoutHistoriesForCampaign } from './payout.validations'

const getPayoutOverviewForCampaign = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await payoutServices.getPayoutOverviewForCampaign(
    user,
    req.params.campaignId as string
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payout overview retrieved successfully!',
    data: result,
  })
})

const getPayoutHistoriesForCampaign = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const query = req.query as unknown as TGetPayoutHistoriesForCampaign
  const result = await payoutServices.getPayoutHistoryForCampaignId(
    user,
    req.params.campaignId as string,
    query
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payout histories retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const payoutControllers = {
  getPayoutOverviewForCampaign,
  getPayoutHistoriesForCampaign,
}
