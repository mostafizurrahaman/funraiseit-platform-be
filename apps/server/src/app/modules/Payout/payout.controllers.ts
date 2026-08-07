import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { payoutServices } from './payout.services'

const createPayout = catchAsync(async (req, res) => {
  const result = await payoutServices.createPayout(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The payout created successfully!',
    data: result,
  })
})

const updatePayout = catchAsync(async (req, res) => {
  const result = await payoutServices.updatePayout(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payout updated successfully!',
    data: result,
  })
})

const getAllPayout = catchAsync(async (req, res) => {
  const result = await payoutServices.getAllPayout(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payout retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getPayoutById = catchAsync(async (req, res) => {
  const result = await payoutServices.getPayoutById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payout retrieved successfully!',
    data: result,
  })
})

const deletePayoutById = catchAsync(async (req, res) => {
  const result = await payoutServices.deletePayoutById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payout deleted successfully!',
    data: result,
  })
})

export const payoutControllers = {
  createPayout,
  updatePayout,
  getAllPayout,
  getPayoutById,
  deletePayoutById
}