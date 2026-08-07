import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { supporterServices } from './supporter.services'
import type { TGetAllSupporterQueryParamsType } from './supporter.validations'
import { getUserFromRequest } from '../../libs/get-user-from-request'

const getAllSupporter = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await supporterServices.getAllSupporter(
    user,
    req.query as TGetAllSupporterQueryParamsType
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The supporter retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getSupporterOverviewByCampaignId = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await supporterServices.getSupporterOverviewByCampaignId(
    user,
    req.query.campaignId as string
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The supporter overview retrieved successfully!',
    data: result,
  })
})

export const supporterControllers = {
  getAllSupporter,
  getSupporterOverviewByCampaignId,
}
