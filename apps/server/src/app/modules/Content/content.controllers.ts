import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { contentServices } from './content.services'

const updateContent = catchAsync(async (req, res) => {
  const result = await contentServices.updateContent(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The content updated successfully!',
    data: result,
  })
})

const getContentByContentType = catchAsync(async (req, res) => {
  const contentType = req.params.contentType as string
  const result = await contentServices.getContentByContentType(contentType)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The content retrieved successfully!',
    data: result,
  })
})

export const contentControllers = {
  updateContent,
  getContentByContentType,
}
