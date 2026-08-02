import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { analyticsValidation } from './analytics.validations'
import { analyticsController } from './analytics.controllers'

const router: Router = express.Router()

router.get(
  '/',
  validateRequest(analyticsValidation.getAnalyticsOverview),
  analyticsController.campaignDashboardAnalytics
)

export const analyticsRoutes = router
