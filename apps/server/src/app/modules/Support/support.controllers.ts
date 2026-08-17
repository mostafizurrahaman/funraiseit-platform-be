import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { supportServices } from './support.services'

const createSupport = catchAsync(async (req, res) => {
  const result = await supportServices.createSupport(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The support created successfully!',
    data: result,
  })
})

const getAllSupport = catchAsync(async (req, res) => {
  const result = await supportServices.getAllSupport(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The support retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const replySupport = catchAsync(async (req, res) => {
  const result = await supportServices.SupportIssueReply(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Support reply sent successfully!',
    data: result,
  })
})

const markSupportInProgress = catchAsync(async (req, res) => {
  const { id } = req.params
  const result = await supportServices.markSupportInProgress(id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Support ticket marked as in-progress successfully!',
    data: result,
  })
})

const markSupportResolved = catchAsync(async (req, res) => {
  const { id } = req.params
  const result = await supportServices.markSupportResolved(id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Support ticket resolved successfully!',
    data: result,
  })
})

export const supportControllers = {
  createSupport,
  getAllSupport,
  replySupport,
  markSupportInProgress,
  markSupportResolved,
}


