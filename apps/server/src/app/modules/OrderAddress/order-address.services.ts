import { OrderAddress, orderAddressSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreateOrderAddressPayloadType,
  TUpdateOrderAddressPayloadType,
  TGetAllOrderAddressQueryParamsType
} from "./order-address.validations"

const createOrderAddress = async (payload: TCreateOrderAddressPayloadType) => {
  const result = await OrderAddress.create(payload)
  return result
}

const updateOrderAddress = async (id: string, payload: TUpdateOrderAddressPayloadType) => {
  const result = await OrderAddress.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "OrderAddress not found")
  }

  return result
}

const getAllOrderAddress = async (query: TGetAllOrderAddressQueryParamsType) => {
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
        $or: orderAddressSearchableFields.map(field => ({
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

  const aggregated = await OrderAddress.aggregate(pipeline)

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

const getOrderAddressById = async (id: string) => {
  const result = await OrderAddress.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "OrderAddress not found")
  }

  return result
}

const deleteOrderAddressById = async (id: string) => {
  const result = await OrderAddress.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "OrderAddress not found")
  }

  return result
}

export const orderAddressServices = {
  createOrderAddress,
  updateOrderAddress,
  getAllOrderAddress,
  getOrderAddressById,
  deleteOrderAddressById
}