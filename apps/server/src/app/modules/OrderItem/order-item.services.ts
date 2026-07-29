import { OrderItem, orderItemSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreateOrderItemPayloadType,
  TUpdateOrderItemPayloadType,
  TGetAllOrderItemQueryParamsType
} from "./order-item.validations"

const createOrderItem = async (payload: TCreateOrderItemPayloadType) => {
  const result = await OrderItem.create(payload)
  return result
}

const updateOrderItem = async (id: string, payload: TUpdateOrderItemPayloadType) => {
  const result = await OrderItem.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "OrderItem not found")
  }

  return result
}

const getAllOrderItem = async (query: TGetAllOrderItemQueryParamsType) => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate
  } = query

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    const dateFilter : Record<string,unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: orderItemSearchableFields.map(field => ({
          [field]: { $regex: searchTerm, $options: 'i' }
        }))
      }
    })
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }]
    }
  })

  const aggregated = await OrderItem.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  }
}

const getOrderItemById = async (id: string) => {
  const result = await OrderItem.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "OrderItem not found")
  }

  return result
}

const deleteOrderItemById = async (id: string) => {
  const result = await OrderItem.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "OrderItem not found")
  }

  return result
}

export const orderItemServices = {
  createOrderItem,
  updateOrderItem,
  getAllOrderItem,
  getOrderItemById,
  deleteOrderItemById
}