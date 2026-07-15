import { discountType, PromoCode, promoCodeSearchableFields, type IUser } from '@repo/db'
import httpStatus from 'http-status'
import { AppError, isExpired } from '@repo/shared'
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
  // Check if the promo code exists
  const existingPromoCode = await PromoCode.findById(id)

  if (!existingPromoCode) {
    throw new AppError(httpStatus.NOT_FOUND, 'Promo code not found with this ID.')
  }

  if (existingPromoCode.usedCount > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This promo code has already been used and can't be updated."
    )
  }

  // Check for duplicate promo code
  const duplicatePromoCode = await PromoCode.findOne({
    code: payload.code?.toUpperCase(),
    _id: { $ne: id },
  })

  if (duplicatePromoCode) {
    const isDuplicateExpired = duplicatePromoCode.expiresAt.getTime() <= Date.now()

    if (!isDuplicateExpired) {
      throw new AppError(
        httpStatus.CONFLICT,
        'A promo code with this code already exists and has not expired.'
      )
    }

    throw new AppError(
      httpStatus.CONFLICT,
      `A promo code with this code already exists with status "${duplicatePromoCode.isActive}".`
    )
  }

  const effectiveDiscountType = payload.discountType ?? existingPromoCode.discountType

  const effectiveDiscountValue = payload.discountValue ?? existingPromoCode.discountValue

  if (effectiveDiscountType === discountType.PERCENTAGE && effectiveDiscountValue > 100) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Discount percentage cannot exceed 100%.')
  }

  if (payload.code) {
    payload.code = payload.code.toUpperCase()
  }

  const promoCode = await PromoCode.findByIdAndUpdate(
    id,
    { $set: payload },
    {
      new: true,
      runValidators: true,
    }
  )

  return promoCode
}

const getAllPromoCode = async (query: TGetAllPromoCodeQueryParamsType) => {
  const {
    page: currentPage = 1,
    limit: currentLimit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
  } = query

  const page = Number(currentPage) || 1
  const limit = Number(currentLimit) || 10

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
