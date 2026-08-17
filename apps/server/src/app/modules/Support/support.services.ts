import { Campaign, Support, supportSearchableFields, User } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateSupportPayloadType,
  TGetAllSupportQueryParamsType,
} from './support.validations'
import { getUniqueTicket } from './support.utils'

const createSupport = async (payload: TCreateSupportPayloadType) => {
  const { email, subject, campaign, message } = payload

  // ?? Check is user exists with this email?:
  const existingUser = await User.findOne({ email })

  // ?? Check is campaign exists:
  const existingCampaign = await Campaign.findById(campaign)
  if (campaign && !existingCampaign) {
    throw new AppError(httpStatus.NOT_FOUND, "Campaign doesn't exists.")
  }

  const ticketNo = await getUniqueTicket()

  const newPayload: Record<string, unknown> = {
    ticketNo,
    subject,
    message,
    email,
  }

  if (existingUser) {
    newPayload['user'] = existingUser?._id
  }

  if (campaign && existingCampaign) {
    newPayload['campaign'] = existingCampaign?._id
  }

  const result = await Support.create(newPayload)
  return result
}

const getAllSupport = async (query: TGetAllSupportQueryParamsType) => {
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

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    {
      $lookup: {
        from: 'campaigns',
        localField: 'campaign',
        foreignField: '_id',
        as: 'campaignDetails',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'organizer',
              foreignField: '_id',
              as: 'organizerDetails',
            },
          },
          {
            $unwind: {
              path: '$organizerDetails',
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$campaignDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$userDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        supportId: '$_id',
        ticketNo: '$ticketNo',
        userId: { $ifNull: ['$user', null] },
        email: '$email',
        userName: { $ifNull: ['$userDetails.name', null] },
        userEmail: { $ifNull: ['$userDetails.email', null] },
        campaignId: { $ifNull: ['$campaign', null] },
        campaignName: {$ifNull: ["$campaignDetails.name", null]},
        campaignCode: {$ifNull: ["$campaignDetails.campaignCode", null]},
        organizerId: {$ifNull: ["$campaignDetails.organizer", null]},
        organizerName: {$ifNull: ["$campaignDetails.organizerDetails.name", null]},
        organizerEmail: {$ifNull: ["$campaignDetails.organizerDetails.email", null]},

        subject: '$subject',
        message: '$message',
        status: '$status',
        createdAt: '$createdAt',
        updatedAt: '$updatedAt',
      },
    }
  )

  pipeline.push()

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: supportSearchableFields.map((field) => ({
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

  const aggregated = await Support.aggregate(pipeline)

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

export const supportServices = {
  createSupport,
  getAllSupport,
}
