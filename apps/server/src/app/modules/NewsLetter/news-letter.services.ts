import { NewsLetter, newsLetterSearchableFields } from '@repo/db'

import type {
  TCreateNewsLetterPayloadType,
  TGetAllNewsLetterQueryParamsType,
} from './news-letter.validations'
import type { PipelineStage } from 'mongoose'

const createNewsLetter = async (payload: TCreateNewsLetterPayloadType) => {
  const { email } = payload

  const isNewsLetterExists = await NewsLetter.findOne({
    email,
  })

  if (isNewsLetterExists) {
    return {
      message: 'Successfully subscribed to the newsletter.',
    }
  }

  await NewsLetter.create(payload)
  return {
    message: 'Successfully subscribed to the newsletter.',
  }
}

const getAllNewsLetter = async (query: TGetAllNewsLetterQueryParamsType) => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
    skipPagination,
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
        $or: newsLetterSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  const isSkipPagination =
    skipPagination === false || (typeof skipPagination === 'string' && skipPagination === 'false')

  const paginationStage: PipelineStage.FacetPipelineStage[] = []

  if (!isSkipPagination) {
    paginationStage.push({ $skip: skip }, { $limit: limit })
  } else {
    paginationStage.push({
      $match: {},
    })
  }

  pipeline.push({
    $facet: {
      data: [],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await NewsLetter.aggregate(pipeline)

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

export const newsLetterServices = {
  createNewsLetter,
  getAllNewsLetter,
}
