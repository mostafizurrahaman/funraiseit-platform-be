import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { supporterControllers } from './supporter.controllers'
import { supporterValidations } from './supporter.validations'
import { auth } from '../../middlewares/auth'
import { AuthRoles } from '@repo/db'

const router: Router = express.Router()

router.get(
  '/all',
  auth(AuthRoles.ORGANIZER),
  validateRequest(supporterValidations.getAllSupporterSchema),
  supporterControllers.getAllSupporter
)

router.get(
  '/overview',
  auth(AuthRoles.ORGANIZER),
  validateRequest(supporterValidations.getSupporterOverviewByID),
  supporterControllers.getSupporterOverviewByCampaignId
)

router.post(
  '/send-email',
  auth(AuthRoles.ORGANIZER),
  validateRequest(supporterValidations.sendEmailToSupporterSchema),
  supporterControllers.sendEmailToSupporters
)
router.post('/send-email-test', auth(AuthRoles.ORGANIZER), supporterControllers.testEmail)

export const supporterRoutes = router
