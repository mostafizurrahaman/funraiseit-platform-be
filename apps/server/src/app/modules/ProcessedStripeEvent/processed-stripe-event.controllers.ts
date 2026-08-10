import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { processedStripeEventServices } from './processed-stripe-event.services'

const createProcessedStripeEvent = catchAsync(async (req, res) => {
  const result = await processedStripeEventServices.createProcessedStripeEvent(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The processed stripe event created successfully!',
    data: result,
  })
})

const updateProcessedStripeEvent = catchAsync(async (req, res) => {
  const result = await processedStripeEventServices.updateProcessedStripeEvent(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The processed stripe event updated successfully!',
    data: result,
  })
})

const getAllProcessedStripeEvent = catchAsync(async (req, res) => {
  const result = await processedStripeEventServices.getAllProcessedStripeEvent(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The processed stripe event retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getProcessedStripeEventById = catchAsync(async (req, res) => {
  const result = await processedStripeEventServices.getProcessedStripeEventById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The processed stripe event retrieved successfully!',
    data: result,
  })
})

const deleteProcessedStripeEventById = catchAsync(async (req, res) => {
  const result = await processedStripeEventServices.deleteProcessedStripeEventById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The processed stripe event deleted successfully!',
    data: result,
  })
})

export const processedStripeEventControllers = {
  createProcessedStripeEvent,
  updateProcessedStripeEvent,
  getAllProcessedStripeEvent,
  getProcessedStripeEventById,
  deleteProcessedStripeEventById
}