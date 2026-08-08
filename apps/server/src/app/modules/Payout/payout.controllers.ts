import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { payoutServices } from './payout.services'
import type { TGetPayoutOverviewForCampaignQuery } from './payout.validations'
import { getUserFromRequest } from '@app/libs/get-user-from-request'

const getPayoutOverviewForCampaign = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await payoutServices.getPayoutOverviewForCampaign(
    user,
    req.params.campaignId as string,
    req.query as TGetPayoutOverviewForCampaignQuery
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payout overview retrieved successfully!',
    data: result,
  })
})

export const payoutControllers = {
  getPayoutOverviewForCampaign,
}
