import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { campaignServices } from './campaign.services'
import type { IMulterFile } from 'packages/media-hub/src'
import { getUserFromRequest } from '@app/libs/get-user-from-request'
import { type IUser } from 'packages/db/src'

const createCampaign = catchAsync(async (req, res) => {
  const user = (await getUserFromRequest(req)) as IUser
  const file = req.file as IMulterFile
  const result = await campaignServices.createCampaign(user, req.body, file)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The campaign created successfully!',
    data: result,
  })
})

const getDraftCampaign = catchAsync(async (req, res) => {
  const user = (await getUserFromRequest(req)) as IUser
  const result = await campaignServices.getDraftCampaign(user)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The draft campaign retrieved successfully!',
    data: result,
  })
})

const getCampaignPreview = catchAsync(async (req, res) => {
  const user = (await getUserFromRequest(req)) as IUser
  const campaignId = req.params.id as string
  const promoCode = req?.body?.promoCode
  const result = await campaignServices.getCampaignPreview(user, campaignId, promoCode)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Campaign preview retrieved successfully.',
    data: result,
  })
})

const updateCampaign = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const payload = req.body
  const campaignId = req.params.id as string
  const thumbnailFile = req.file as IMulterFile

  const result = await campaignServices.updateCampaign(campaignId, user, payload, thumbnailFile)

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

const getAllActiveCampaign = catchAsync(async (req, res) => {
  const result = await campaignServices.getAllActiveCampaign(req.query)

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

const getCampaignByCampaignCode = catchAsync(async (req, res) => {
  const result = await campaignServices.getCampaignByCampaignCode(req.params.code as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The campaign retrieved successfully!',
    data: result,
  })
})

const launchCampaignByID = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const campaignId = req.params.id as string
  const promoCode = req.body.promoCode

  const result = await campaignServices.launchCampaignByID(user, campaignId, promoCode)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'For launching the campaign complete the payment.',
    data: result,
  })
})

const generateCampaignStory = catchAsync(async (req, res) => {
  const story = req.body.story

  const result = await campaignServices.generateCampaignStory(story)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Story generated successfully for your campaign',
    data: result,
  })
})

export const campaignControllers = {
  createCampaign,
  getDraftCampaign,
  updateCampaign,
  getAllCampaign,
  getCampaignById,
  getCampaignByCampaignCode,
  // deleteCampaignById,
  launchCampaignByID,
  getCampaignPreview,
  getAllActiveCampaign,
  generateCampaignStory,
}
