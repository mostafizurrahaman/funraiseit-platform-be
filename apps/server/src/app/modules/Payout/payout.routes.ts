import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { payoutControllers } from './payout.controllers'
import { payoutValidations } from './payout.validations'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.get(
  '/:campaignId/overview',
  auth(AuthRoles.ORGANIZER),
  validateRequest(payoutValidations.getPayoutOverviewForCampaign),
  payoutControllers.getPayoutOverviewForCampaign
)

router.get(
  '/:campaignId',
  auth(AuthRoles.ORGANIZER),
  validateRequest(payoutValidations.getPayoutHistoriesForCampaign),
  payoutControllers.getPayoutHistoriesForCampaign
)

export const payoutRoutes = router
