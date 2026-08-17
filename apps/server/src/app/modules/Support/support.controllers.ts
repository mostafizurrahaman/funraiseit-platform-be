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

export const supportControllers = {
  createSupport,

  getAllSupport,
}
