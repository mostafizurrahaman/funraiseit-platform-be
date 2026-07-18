import { Payment, paymentSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreatePaymentPayloadType,
  TUpdatePaymentPayloadType,
  TGetAllPaymentQueryParamsType
} from "./payment.validations"

const createPayment = async (payload: TCreatePaymentPayloadType) => {
  const result = await Payment.create(payload)
  return result
}

const updatePayment = async (id: string, payload: TUpdatePaymentPayloadType) => {
  const result = await Payment.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found")
  }

  return result
}

const getAllPayment = async (query: TGetAllPaymentQueryParamsType) => {
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
        $or: paymentSearchableFields.map(field => ({
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

  const aggregated = await Payment.aggregate(pipeline)

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

const getPaymentById = async (id: string) => {
  const result = await Payment.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found")
  }

  return result
}

const deletePaymentById = async (id: string) => {
  const result = await Payment.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found")
  }

  return result
}

export const paymentServices = {
  createPayment,
  updatePayment,
  getAllPayment,
  getPaymentById,
  deletePaymentById
}