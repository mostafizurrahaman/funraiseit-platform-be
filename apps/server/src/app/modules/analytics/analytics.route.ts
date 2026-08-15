import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { analyticsValidation } from './analytics.validations'
import { analyticsController } from './analytics.controllers'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.get(
  '/',
  validateRequest(analyticsValidation.getAnalyticsOverview),
  analyticsController.campaignDashboardAnalytics
)

router.get(
  '/admin',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  // validateRequest(analyticsValidation.getAnalyticsOverview),
  analyticsController.getAnalyticsForAdminPortal
)
export const analyticsRoutes = router
