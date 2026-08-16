import { SupportReply, supportReplySearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreateSupportReplyPayloadType,
  TUpdateSupportReplyPayloadType,
  TGetAllSupportReplyQueryParamsType
} from "./support-reply.validations"

const createSupportReply = async (payload: TCreateSupportReplyPayloadType) => {
  const result = await SupportReply.create(payload)
  return result
}

const updateSupportReply = async (id: string, payload: TUpdateSupportReplyPayloadType) => {
  const result = await SupportReply.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "SupportReply not found")
  }

  return result
}

const getAllSupportReply = async (query: TGetAllSupportReplyQueryParamsType) => {
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
        $or: supportReplySearchableFields.map(field => ({
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

  const aggregated = await SupportReply.aggregate(pipeline)

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

const getSupportReplyById = async (id: string) => {
  const result = await SupportReply.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "SupportReply not found")
  }

  return result
}

const deleteSupportReplyById = async (id: string) => {
  const result = await SupportReply.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "SupportReply not found")
  }

  return result
}

export const supportReplyServices = {
  createSupportReply,
  updateSupportReply,
  getAllSupportReply,
  getSupportReplyById,
  deleteSupportReplyById
}