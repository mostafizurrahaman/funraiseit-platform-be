import { Product, productSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreateProductPayloadType,
  TUpdateProductPayloadType,
  TGetAllProductQueryParamsType
} from "./product.validations"

const createProduct = async (payload: TCreateProductPayloadType) => {
  const result = await Product.create(payload)
  return result
}

const updateProduct = async (id: string, payload: TUpdateProductPayloadType) => {
  const result = await Product.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found")
  }

  return result
}

const getAllProduct = async (query: TGetAllProductQueryParamsType) => {
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
        $or: productSearchableFields.map(field => ({
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

  const aggregated = await Product.aggregate(pipeline)

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

const getProductById = async (id: string) => {
  const result = await Product.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found")
  }

  return result
}

const deleteProductById = async (id: string) => {
  const result = await Product.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found")
  }

  return result
}

export const productServices = {
  createProduct,
  updateProduct,
  getAllProduct,
  getProductById,
  deleteProductById
}