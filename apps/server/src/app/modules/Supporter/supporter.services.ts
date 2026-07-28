import { Supporter, supporterSearchableFields } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateSupporterPayloadType,
  TUpdateSupporterPayloadType,
  TGetAllSupporterQueryParamsType,
} from './supporter.validations'

const createSupporter = async (payload: TCreateSupporterPayloadType) => {
  const result = await Supporter.create(payload)
  return result
}

const updateSupporter = async (id: string, payload: TUpdateSupporterPayloadType) => {
  const result = await Supporter.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Supporter not found')
  }

  return result
}

const getAllSupporter = async (query: TGetAllSupporterQueryParamsType) => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
  } = query

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: supporterSearchableFields.map((field: string) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await Supporter.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

const getSupporterById = async (id: string) => {
  const result = await Supporter.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Supporter not found')
  }

  return result
}

const deleteSupporterById = async (id: string) => {
  const result = await Supporter.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Supporter not found')
  }

  return result
}

export const supporterServices = {
  createSupporter,
  updateSupporter,
  getAllSupporter,
  getSupporterById,
  deleteSupporterById,
}
