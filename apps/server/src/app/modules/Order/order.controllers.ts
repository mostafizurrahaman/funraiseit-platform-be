import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { orderServices } from './order.services'
import { getUserFromRequest } from '../../libs/get-user-from-request'
import type { TGetAllOrderQueryParamsType } from './order.validations'

const createOrder = catchAsync(async (req, res) => {
  const result = await orderServices.createOrder(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The order created successfully!',
    data: result,
  })
})

const previewOrder = catchAsync(async (req, res) => {
  const result = await orderServices.previewOrderPrice(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order details retrieved successfully!',
    data: result,
  })
})

const getAllOrder = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await orderServices.getAllOrder(user, req.query as TGetAllOrderQueryParamsType)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getCampaignOrderOverview = catchAsync(async (req, res) => {
  const campaignId = req.query.campaignId
  const user = await getUserFromRequest(req)
  const result = await orderServices.getCampaignOrderOverview(user, campaignId as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The campaign order overview retrieved successfully!',
    data: result,
  })
})

const getOrderById = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await orderServices.getOrderById(user, req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order retrieved successfully!',
    data: result,
  })
})

const cancelOrder = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const orderId = req.params.id as string
  const reason = req.body?.reason

  const result = await orderServices.cancelOrder(user, orderId, reason)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order cancelled successfully!',
    data: result,
  })
})

const cancelOrderItem = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const itemId = req.params.itemId as string
  const reason = req.body?.reason

  const result = await orderServices.cancelOrderItem(user, itemId, reason)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order item cancelled successfully!',
    data: result,
  })
})

const deliverPhysicalItem = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const itemId = req.params.itemId as string

  const result = await orderServices.deliverPhysicalItem(user, itemId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The physical item marked as shipped successfully!',
    data: result,
  })
})

const fulfillDigitalItem = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const itemId = req.params.itemId as string

  const result = await orderServices.fulfillDigitalItem(user, itemId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The digital item fulfilled and download link delivered successfully!',
    data: result,
  })
})

const deliverAllOrderItems = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const orderId = req.params.id as string

  const result = await orderServices.deliverAllOrderItems(user, orderId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All order items delivered successfully!',
    data: result,
  })
})

const updateOrderItemStatus = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const itemId = req.params.itemId as string
  const status = req.body.status

  const result = await orderServices.updateOrderItemStatus(user, itemId, status)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order item status updated successfully!',
    data: result,
  })
})

const updateOrderStatus = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const orderId = req.params.id as string
  const status = req.body.status

  const result = await orderServices.updateOrderStatus(user, orderId, status)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order status updated successfully!',
    data: result,
  })
})

export const orderControllers = {
  createOrder,
  getAllOrder,
  getOrderById,
  previewOrder,
  getCampaignOrderOverview,
  cancelOrder,
  cancelOrderItem,
  deliverPhysicalItem,
  fulfillDigitalItem,
  deliverAllOrderItems,
  updateOrderItemStatus,
  updateOrderStatus,
}
