import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { reviewControllers } from './review.controllers'
import { reviewValidations } from './review.validations'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.get('/status', auth(AuthRoles.ORGANIZER), reviewControllers.getReviewStatus)

router.patch('/skip', auth(AuthRoles.ORGANIZER), reviewControllers.skipReview)

router.post(
  '/',
  auth(AuthRoles.ORGANIZER),
  validateRequest(reviewValidations.createReviewSchema),
  reviewControllers.createReview
)

router.get(
  '/all',
  validateRequest(reviewValidations.getAllReviewSchema),
  reviewControllers.getAllReview
)

router.patch(
  '/:id',
  validateRequest(reviewValidations.toggleIsFeatured),
  reviewControllers.toggleFeaturedById
)

export const reviewRoutes = router
