import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { reviewServices } from './review.services'
import { getUserFromRequest } from '@app/libs/get-user-from-request'
import type { TGetAllReviewQueryParamsType } from './review.validations'

const getReviewStatus = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await reviewServices.getReviewStatus(user)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Review status retrieved successfully.',
    data: result,
  })
})

const skipReview = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  await reviewServices.skipReview(user)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Review skipped successfully.',
    data: null,
  })
})

const createReview = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await reviewServices.createReview(user, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Review submitted successfully! Thank you for your feedback.',
    data: result,
  })
})

const toggleFeaturedById = catchAsync(async (req, res) => {
  const result = await reviewServices.toggleIsFeaturedByID(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `The review has been ${
      result.isFeatured ? 'marked as featured' : 'removed from featured'
    } successfully!`,
    data: result,
  })
})

const getAllReview = catchAsync(async (req, res) => {
  const result = await reviewServices.getAllReview(
    req.query as unknown as TGetAllReviewQueryParamsType
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The review retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const reviewControllers = {
  createReview,
  skipReview,
  getReviewStatus,
  getAllReview,
  toggleFeaturedById,
}
