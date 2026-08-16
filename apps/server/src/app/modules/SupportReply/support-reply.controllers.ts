import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { supportReplyServices } from './support-reply.services'

const createSupportReply = catchAsync(async (req, res) => {
  const result = await supportReplyServices.createSupportReply(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The support reply created successfully!',
    data: result,
  })
})

const updateSupportReply = catchAsync(async (req, res) => {
  const result = await supportReplyServices.updateSupportReply(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The support reply updated successfully!',
    data: result,
  })
})

const getAllSupportReply = catchAsync(async (req, res) => {
  const result = await supportReplyServices.getAllSupportReply(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The support reply retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getSupportReplyById = catchAsync(async (req, res) => {
  const result = await supportReplyServices.getSupportReplyById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The support reply retrieved successfully!',
    data: result,
  })
})

const deleteSupportReplyById = catchAsync(async (req, res) => {
  const result = await supportReplyServices.deleteSupportReplyById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The support reply deleted successfully!',
    data: result,
  })
})

export const supportReplyControllers = {
  createSupportReply,
  updateSupportReply,
  getAllSupportReply,
  getSupportReplyById,
  deleteSupportReplyById
}