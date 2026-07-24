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

const addProductIntoCampaign = catchAsync(async (req, res) => {
  const user = (await getUserFromRequest(req)) as IUser
  const files = req.files as { [fieldname: string]: IMulterFile[] }
  const payload = req.body
  const campaignId = req.params.id as string
  const productImage = files?.['productImage']?.[0] as IMulterFile
  const downloadFile = files?.['downloadFiles']?.[0] as IMulterFile
  const result = await campaignServices.addProductIntoCampaign(
    user,
    campaignId,
    payload,
    productImage,
    downloadFile
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'A product added into campaign successfully!',
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
  addProductIntoCampaign,
  getCampaignPreview,
}
