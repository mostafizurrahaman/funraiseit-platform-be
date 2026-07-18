import { Campaign, campaignSearchableFields  } from "@repo/db"
import httpStatus from "http-status"
import { AppError } from "@repo/shared"
import type { PipelineStage } from "mongoose"

import type {
  TCreateCampaignPayloadType,
  TUpdateCampaignPayloadType,
  TGetAllCampaignQueryParamsType
} from "./campaign.validations"

const createCampaign = async (payload: TCreateCampaignPayloadType) => {
  const result = await Campaign.create(payload)
  return result
}

const updateCampaign = async (id: string, payload: TUpdateCampaignPayloadType) => {
  const result = await Campaign.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Campaign not found")
  }

  return result
}

const getAllCampaign = async (query: TGetAllCampaignQueryParamsType) => {
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
        $or: campaignSearchableFields.map(field => ({
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

  const aggregated = await Campaign.aggregate(pipeline)

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

const getCampaignById = async (id: string) => {
  const result = await Campaign.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Campaign not found")
  }

  return result
}

const deleteCampaignById = async (id: string) => {
  const result = await Campaign.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Campaign not found")
  }

  return result
}

export const campaignServices = {
  createCampaign,
  updateCampaign,
  getAllCampaign,
  getCampaignById,
  deleteCampaignById
}