import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { promoCodeUsageServices } from './promo-code-usage.services'

const createPromoCodeUsage = catchAsync(async (req, res) => {
  const result = await promoCodeUsageServices.createPromoCodeUsage(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The promo code usage created successfully!',
    data: result,
  })
})

const updatePromoCodeUsage = catchAsync(async (req, res) => {
  const result = await promoCodeUsageServices.updatePromoCodeUsage(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The promo code usage updated successfully!',
    data: result,
  })
})

const getAllPromoCodeUsage = catchAsync(async (req, res) => {
  const result = await promoCodeUsageServices.getAllPromoCodeUsage(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The promo code usage retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getPromoCodeUsageById = catchAsync(async (req, res) => {
  const result = await promoCodeUsageServices.getPromoCodeUsageById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The promo code usage retrieved successfully!',
    data: result,
  })
})

const deletePromoCodeUsageById = catchAsync(async (req, res) => {
  const result = await promoCodeUsageServices.deletePromoCodeUsageById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The promo code usage deleted successfully!',
    data: result,
  })
})

export const promoCodeUsageControllers = {
  createPromoCodeUsage,
  updatePromoCodeUsage,
  getAllPromoCodeUsage,
  getPromoCodeUsageById,
  deletePromoCodeUsageById
}