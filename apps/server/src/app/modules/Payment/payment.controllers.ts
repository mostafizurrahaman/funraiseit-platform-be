import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { paymentServices } from './payment.services'

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

const getPaymentOverview = catchAsync(async (req, res) => {
  const result = await paymentServices.getPaymentOverview()

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The payment overview retrieved successfully!',
    data: result,
  })
})

export const paymentControllers = {
  getAllPayment,
  getPaymentOverview,
}
