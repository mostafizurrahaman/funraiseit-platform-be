import { SiteInfo, siteInfoSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreateSiteInfoPayloadType,
  TUpdateSiteInfoPayloadType,
  TGetAllSiteInfoQueryParamsType
} from "./site-info.validations"

const createSiteInfo = async (payload: TCreateSiteInfoPayloadType) => {
  const result = await SiteInfo.create(payload)
  return result
}

const updateSiteInfo = async (id: string, payload: TUpdateSiteInfoPayloadType) => {
  const result = await SiteInfo.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "SiteInfo not found")
  }

  return result
}

const getAllSiteInfo = async (query: TGetAllSiteInfoQueryParamsType) => {
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
        $or: siteInfoSearchableFields.map(field => ({
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

  const aggregated = await SiteInfo.aggregate(pipeline)

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

const getSiteInfoById = async (id: string) => {
  const result = await SiteInfo.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "SiteInfo not found")
  }

  return result
}

const deleteSiteInfoById = async (id: string) => {
  const result = await SiteInfo.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "SiteInfo not found")
  }

  return result
}

export const siteInfoServices = {
  createSiteInfo,
  updateSiteInfo,
  getAllSiteInfo,
  getSiteInfoById,
  deleteSiteInfoById
}