import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { campaignServices } from './campaign.services'

const createCampaign = catchAsync(async (req, res) => {
  const result = await campaignServices.createCampaign(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The campaign created successfully!',
    data: result,
  })
})

const updateCampaign = catchAsync(async (req, res) => {
  const result = await campaignServices.updateCampaign(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The campaign updated successfully!',
    data: result,
  })
})

const getAllCampaign = catchAsync(async (req, res) => {
  const result = await campaignServices.getAllCampaign(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The campaign retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getCampaignById = catchAsync(async (req, res) => {
  const result = await campaignServices.getCampaignById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The campaign retrieved successfully!',
    data: result,
  })
})

const deleteCampaignById = catchAsync(async (req, res) => {
  const result = await campaignServices.deleteCampaignById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The campaign deleted successfully!',
    data: result,
  })
})

export const campaignControllers = {
  createCampaign,
  updateCampaign,
  getAllCampaign,
  getCampaignById,
  deleteCampaignById,
}
