import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { orderAddressServices } from './order-address.services'

const createOrderAddress = catchAsync(async (req, res) => {
  const result = await orderAddressServices.createOrderAddress(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The order address created successfully!',
    data: result,
  })
})

const updateOrderAddress = catchAsync(async (req, res) => {
  const result = await orderAddressServices.updateOrderAddress(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order address updated successfully!',
    data: result,
  })
})

const getAllOrderAddress = catchAsync(async (req, res) => {
  const result = await orderAddressServices.getAllOrderAddress(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order address retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getOrderAddressById = catchAsync(async (req, res) => {
  const result = await orderAddressServices.getOrderAddressById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order address retrieved successfully!',
    data: result,
  })
})

const deleteOrderAddressById = catchAsync(async (req, res) => {
  const result = await orderAddressServices.deleteOrderAddressById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order address deleted successfully!',
    data: result,
  })
})

export const orderAddressControllers = {
  createOrderAddress,
  updateOrderAddress,
  getAllOrderAddress,
  getOrderAddressById,
  deleteOrderAddressById
}