import { Payout, payoutSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreatePayoutPayloadType,
  TUpdatePayoutPayloadType,
  TGetAllPayoutQueryParamsType
} from "./payout.validations"

const createPayout = async (payload: TCreatePayoutPayloadType) => {
  const result = await Payout.create(payload)
  return result
}

const updatePayout = async (id: string, payload: TUpdatePayoutPayloadType) => {
  const result = await Payout.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Payout not found")
  }

  return result
}

const getAllPayout = async (query: TGetAllPayoutQueryParamsType) => {
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
        $or: payoutSearchableFields.map(field => ({
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

  const aggregated = await Payout.aggregate(pipeline)

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

const getPayoutById = async (id: string) => {
  const result = await Payout.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Payout not found")
  }

  return result
}

const deletePayoutById = async (id: string) => {
  const result = await Payout.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Payout not found")
  }

  return result
}

export const payoutServices = {
  createPayout,
  updatePayout,
  getAllPayout,
  getPayoutById,
  deletePayoutById
}