import { PromoCodeUsage, promoCodeUsageSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreatePromoCodeUsagePayloadType,
  TUpdatePromoCodeUsagePayloadType,
  TGetAllPromoCodeUsageQueryParamsType
} from "./promo-code-usage.validations"

const createPromoCodeUsage = async (payload: TCreatePromoCodeUsagePayloadType) => {
  const result = await PromoCodeUsage.create(payload)
  return result
}

const updatePromoCodeUsage = async (id: string, payload: TUpdatePromoCodeUsagePayloadType) => {
  const result = await PromoCodeUsage.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "PromoCodeUsage not found")
  }

  return result
}

const getAllPromoCodeUsage = async (query: TGetAllPromoCodeUsageQueryParamsType) => {
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
        $or: promoCodeUsageSearchableFields.map(field => ({
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

  const aggregated = await PromoCodeUsage.aggregate(pipeline)

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

const getPromoCodeUsageById = async (id: string) => {
  const result = await PromoCodeUsage.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "PromoCodeUsage not found")
  }

  return result
}

const deletePromoCodeUsageById = async (id: string) => {
  const result = await PromoCodeUsage.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "PromoCodeUsage not found")
  }

  return result
}

export const promoCodeUsageServices = {
  createPromoCodeUsage,
  updatePromoCodeUsage,
  getAllPromoCodeUsage,
  getPromoCodeUsageById,
  deletePromoCodeUsageById
}