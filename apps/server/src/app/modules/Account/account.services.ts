import { Account, accountSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreateAccountPayloadType,
  TUpdateAccountPayloadType,
  TGetAllAccountQueryParamsType
} from "./account.validations"

const createAccount = async (payload: TCreateAccountPayloadType) => {
  const result = await Account.create(payload)
  return result
}

const updateAccount = async (id: string, payload: TUpdateAccountPayloadType) => {
  const result = await Account.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Account not found")
  }

  return result
}

const getAllAccount = async (query: TGetAllAccountQueryParamsType) => {
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
        $or: accountSearchableFields.map(field => ({
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

  const aggregated = await Account.aggregate(pipeline)

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

const getAccountById = async (id: string) => {
  const result = await Account.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Account not found")
  }

  return result
}

const deleteAccountById = async (id: string) => {
  const result = await Account.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Account not found")
  }

  return result
}

export const accountServices = {
  createAccount,
  updateAccount,
  getAllAccount,
  getAccountById,
  deleteAccountById
}