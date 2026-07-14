import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { siteInfoServices } from './site-info.services'

const createSiteInfo = catchAsync(async (req, res) => {
  const result = await siteInfoServices.createSiteInfo(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The site info created successfully!',
    data: result,
  })
})

const updateSiteInfo = catchAsync(async (req, res) => {
  const result = await siteInfoServices.updateSiteInfo(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The site info updated successfully!',
    data: result,
  })
})

const getAllSiteInfo = catchAsync(async (req, res) => {
  const result = await siteInfoServices.getAllSiteInfo(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The site info retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getSiteInfoById = catchAsync(async (req, res) => {
  const result = await siteInfoServices.getSiteInfoById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The site info retrieved successfully!',
    data: result,
  })
})

const deleteSiteInfoById = catchAsync(async (req, res) => {
  const result = await siteInfoServices.deleteSiteInfoById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The site info deleted successfully!',
    data: result,
  })
})

export const siteInfoControllers = {
  createSiteInfo,
  updateSiteInfo,
  getAllSiteInfo,
  getSiteInfoById,
  deleteSiteInfoById
}