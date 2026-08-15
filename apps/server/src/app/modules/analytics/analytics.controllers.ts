import httpStatus from 'http-status'
import { catchAsync, sendResponse } from '@repo/shared'
import type { TGetAnalyticsOverview } from './analytics.validations'
import { analyticServices } from './analytics.services'

const campaignDashboardAnalytics = catchAsync(async (req, res) => {
  const query = req.query as unknown as TGetAnalyticsOverview

  const result = await analyticServices.getCampaignAnalyticsFromDB(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `The campaign analytics retrieved successfully.`,
    data: result,
  })
})

const getAnalyticsForAdminPortal = catchAsync(async (req, res) => {
  const result = await analyticServices.getAnalyticsForAdminPortal()

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `The dashboard analytics retrieved successfully.`,
    data: result,
  })
})


export const analyticsController = {
  campaignDashboardAnalytics,
  getAnalyticsForAdminPortal,
}
