import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { paymentServices } from './payment.services'

const createPayment = catchAsync(async (req, res) => {
  const result = await paymentServices.createPayment(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The payment created successfully!',
    data: result,
  })
})

const updatePayment = catchAsync(async (req, res) => {
  const result = await paymentServices.updatePayment(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payment updated successfully!',
    data: result,
  })
})

const getAllPayment = catchAsync(async (req, res) => {
  const result = await paymentServices.getAllPayment(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payment retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getPaymentById = catchAsync(async (req, res) => {
  const result = await paymentServices.getPaymentById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payment retrieved successfully!',
    data: result,
  })
})

const deletePaymentById = catchAsync(async (req, res) => {
  const result = await paymentServices.deletePaymentById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payment deleted successfully!',
    data: result,
  })
})

export const paymentControllers = {
  createPayment,
  updatePayment,
  getAllPayment,
  getPaymentById,
  deletePaymentById
}