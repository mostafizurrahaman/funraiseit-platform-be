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

const updateOrder = catchAsync(async (req, res) => {
  const result = await orderServices.updateOrder(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order updated successfully!',
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
  console.log({ campaignId })
  const result = await orderServices.getCampaignOrderOverview(user, campaignId as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The campaign order overview retrieved successfully!',
    data: result,
  })
})

const getOrderById = catchAsync(async (req, res) => {
  const result = await orderServices.getOrderById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order retrieved successfully!',
    data: result,
  })
})

const deleteOrderById = catchAsync(async (req, res) => {
  const result = await orderServices.deleteOrderById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The order deleted successfully!',
    data: result,
  })
})

export const orderControllers = {
  createOrder,
  updateOrder,
  getAllOrder,
  getOrderById,
  deleteOrderById,
  previewOrder,
  getCampaignOrderOverview,
}
