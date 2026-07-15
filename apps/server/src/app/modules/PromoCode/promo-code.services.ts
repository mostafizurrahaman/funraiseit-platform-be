import { PromoCode, promoCodeSearchableFields, type IUser } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreatePromoCodePayloadType,
  TUpdatePromoCodePayloadType,
  TGetAllPromoCodeQueryParamsType,
} from './promo-code.validations'

const createPromoCode = async (user: IUser, payload: TCreatePromoCodePayloadType) => {
  const { code, discountType, discountValue, expiresAt, usageLimit } = payload

  //  ? Check is the code already exists ?
  const existingCode = await PromoCode.findOne({
    code: code?.toUpperCase(),
  })

  // ? Check expired code validation:
  if (existingCode) {
    const isExpired = existingCode.expiresAt.getTime() <= Date.now()

    if (!isExpired && existingCode.isActive) {
      throw new AppError(httpStatus.CONFLICT, 'An active promo code with this code already exists.')
    }

    if (!isExpired) {
      throw new AppError(
        httpStatus.CONFLICT,
        'A promo code with this code already exists and has not expired.'
      )
    }

    throw new AppError(httpStatus.CONFLICT, 'A promo code with this code already exists.')
  }

  //  Create the promo code now:
  const promoCode = await PromoCode.create({
    code: code?.toUpperCase(),
    discountType,
    discountValue,
    expiresAt: new Date(expiresAt),
    usageLimit,
    createdBy: user?._id,
  })

  return promoCode
}

const updatePromoCode = async (id: string, payload: TUpdatePromoCodePayloadType) => {
  const result = await PromoCode.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'PromoCode not found')
  }

  return result
}

const getAllPromoCode = async (query: TGetAllPromoCodeQueryParamsType) => {
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
        $or: promoCodeSearchableFields.map((field) => ({
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

  const aggregated = await PromoCode.aggregate(pipeline)

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

const getPromoCodeById = async (id: string) => {
  const result = await PromoCode.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'PromoCode not found')
  }

  return result
}

const deletePromoCodeById = async (id: string) => {
  const result = await PromoCode.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'PromoCode not found')
  }

  return result
}

export const promoCodeServices = {
  createPromoCode,
  updatePromoCode,
  getAllPromoCode,
  getPromoCodeById,
  deletePromoCodeById,
}
