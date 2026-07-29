import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { orderItemServices } from './order-item.services'

const createOrderItem = catchAsync(async (req, res) => {
  const result = await orderItemServices.createOrderItem(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The order item created successfully!',
    data: result,
  })
})

const updateOrderItem = catchAsync(async (req, res) => {
  const result = await orderItemServices.updateOrderItem(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order item updated successfully!',
    data: result,
  })
})

const getAllOrderItem = catchAsync(async (req, res) => {
  const result = await orderItemServices.getAllOrderItem(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order item retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getOrderItemById = catchAsync(async (req, res) => {
  const result = await orderItemServices.getOrderItemById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order item retrieved successfully!',
    data: result,
  })
})

const deleteOrderItemById = catchAsync(async (req, res) => {
  const result = await orderItemServices.deleteOrderItemById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order item deleted successfully!',
    data: result,
  })
})

export const orderItemControllers = {
  createOrderItem,
  updateOrderItem,
  getAllOrderItem,
  getOrderItemById,
  deleteOrderItemById
}