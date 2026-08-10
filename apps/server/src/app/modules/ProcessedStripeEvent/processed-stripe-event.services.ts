import { ProcessedStripeEvent, processedStripeEventSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreateProcessedStripeEventPayloadType,
  TUpdateProcessedStripeEventPayloadType,
  TGetAllProcessedStripeEventQueryParamsType
} from "./processed-stripe-event.validations"

const createProcessedStripeEvent = async (payload: TCreateProcessedStripeEventPayloadType) => {
  const result = await ProcessedStripeEvent.create(payload)
  return result
}

const updateProcessedStripeEvent = async (id: string, payload: TUpdateProcessedStripeEventPayloadType) => {
  const result = await ProcessedStripeEvent.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "ProcessedStripeEvent not found")
  }

  return result
}

const getAllProcessedStripeEvent = async (query: TGetAllProcessedStripeEventQueryParamsType) => {
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
        $or: processedStripeEventSearchableFields.map(field => ({
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

  const aggregated = await ProcessedStripeEvent.aggregate(pipeline)

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

const getProcessedStripeEventById = async (id: string) => {
  const result = await ProcessedStripeEvent.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "ProcessedStripeEvent not found")
  }

  return result
}

const deleteProcessedStripeEventById = async (id: string) => {
  const result = await ProcessedStripeEvent.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "ProcessedStripeEvent not found")
  }

  return result
}

export const processedStripeEventServices = {
  createProcessedStripeEvent,
  updateProcessedStripeEvent,
  getAllProcessedStripeEvent,
  getProcessedStripeEventById,
  deleteProcessedStripeEventById
}