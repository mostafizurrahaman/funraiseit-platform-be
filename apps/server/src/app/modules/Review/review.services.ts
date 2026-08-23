import { Campaign, CampaignStatus, Review, reviewSearchableFields, type IUser } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type { TCreateReviewPayloadType, TGetAllReviewQueryParamsType } from './review.validations'

const getReviewStatus = async (user: IUser) => {
  // 1. Has the user already reviewed?
  const hasReview = await Review.exists({ organizer: user._id })

  // 2. Has the user completed at least one successful campaign?
  const hasSuccessfulCampaign = await Campaign.exists({
    organizer: user._id,
    status: { $in: [CampaignStatus.COMPLETED, CampaignStatus.PAID_OUT] },
  })

  // 3. Has the user skipped the review prompt?
  const isSkipped = user.hasSkippedReview

  return {
    hasReview: !!hasReview,
    hasSuccessfulCampaign: !!hasSuccessfulCampaign,
    isSkipped: !!isSkipped,
    isEligibleForReview: !hasReview && !!hasSuccessfulCampaign && !isSkipped,
  }
}

const skipReview = async (user: IUser) => {
  user.hasSkippedReview = true
  await user.save({ validateBeforeSave: false })
  return null
}

const createReview = async (user: IUser, payload: TCreateReviewPayloadType) => {
  const { rating, message } = payload

  const { hasReview, hasSuccessfulCampaign } = await getReviewStatus(user)

  if (!hasSuccessfulCampaign) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You must have at least one successfully completed campaign to leave a review.'
    )
  }

  if (hasReview) {
    throw new AppError(httpStatus.CONFLICT, 'You have already submitted a review for the platform.')
  }

  const review = await Review.create({
    organizer: user._id,
    rating,
    message,
  })

  return review
}
const toggleIsFeaturedByID = async (id: string) => {
  const result = await Review.findByIdAndUpdate(
    id,
    [
      {
        $set: {
          isFeatured: { $not: '$isFeatured' },
        },
      },
    ],
    {
      new: true,
      updatePipeline: true,
    }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found')
  }

  return result
}

const getAllReview = async (query: TGetAllReviewQueryParamsType) => {
  const {
    page: currentPage = 1,
    limit: currentLimit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    isFeatured,
    fromDate,
    toDate,
  } = query

  const limit = Number(currentLimit) || 10
  const page = Number(currentPage) || 1

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
        $or: reviewSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  if (isFeatured !== undefined) {
    const featured =
      isFeatured === true || (typeof isFeatured === 'string' && isFeatured === 'true')
    pipeline.push({ $match: { isFeatured: featured } })
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await Review.aggregate(pipeline)

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

export const reviewServices = {
  getReviewStatus,
  createReview,
  skipReview,
  toggleIsFeaturedByID,
  getAllReview,
}
