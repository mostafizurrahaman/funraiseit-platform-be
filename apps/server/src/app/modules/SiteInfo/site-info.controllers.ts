import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { siteInfoServices } from './site-info.services'
import { getUserFromRequest } from '@app/libs/get-user-from-request'

const createSiteInfo = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)

  const result = await siteInfoServices.createSiteInfo(user, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The site info created successfully!',
    data: result,
  })
})

const getSiteInfo = catchAsync(async (req, res) => {
  const result = await siteInfoServices.getSiteInfo()

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The site info retrieved successfully!',
    data: result,
  })
})

export const siteInfoControllers = {
  createSiteInfo,

  getSiteInfo,
}
