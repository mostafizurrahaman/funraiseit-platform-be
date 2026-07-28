import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { supporterServices } from './supporter.services'

const createSupporter = catchAsync(async (req, res) => {
  const result = await supporterServices.createSupporter(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The supporter created successfully!',
    data: result,
  })
})

const updateSupporter = catchAsync(async (req, res) => {
  const result = await supporterServices.updateSupporter(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The supporter updated successfully!',
    data: result,
  })
})

const getAllSupporter = catchAsync(async (req, res) => {
  const result = await supporterServices.getAllSupporter(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The supporter retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getSupporterById = catchAsync(async (req, res) => {
  const result = await supporterServices.getSupporterById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The supporter retrieved successfully!',
    data: result,
  })
})

const deleteSupporterById = catchAsync(async (req, res) => {
  const result = await supporterServices.deleteSupporterById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The supporter deleted successfully!',
    data: result,
  })
})

export const supporterControllers = {
  createSupporter,
  updateSupporter,
  getAllSupporter,
  getSupporterById,
  deleteSupporterById
}