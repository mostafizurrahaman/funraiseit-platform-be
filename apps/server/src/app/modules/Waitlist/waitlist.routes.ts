import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { auth } from '../../middlewares/auth'
import { AuthRoles } from '@repo/db'
import { waitlistControllers } from './waitlist.controllers'
import { waitlistValidations } from './waitlist.validations'

const router: Router = express.Router()

router.post(
  '/email',
  validateRequest(waitlistValidations.submitEmailSchema),
  waitlistControllers.submitEmail
)

router.post(
  '/claim-vip',
  validateRequest(waitlistValidations.claimVipSchema),
  waitlistControllers.claimVip
)

router.post(
  '/skip-vip',
  validateRequest(waitlistValidations.skipVipSchema),
  waitlistControllers.skipVip
)

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(waitlistValidations.getAllWaitlistSchema),
  waitlistControllers.getAllWaitlist
)

router.get(
  '/export-csv',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(waitlistValidations.exportWaitlistSchema),
  waitlistControllers.exportWaitlistCsv
)

router.get(
  '/export-excel',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(waitlistValidations.exportWaitlistSchema),
  waitlistControllers.exportWaitlistExcel
)

router.get(
  '/export-xlsx',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(waitlistValidations.exportWaitlistSchema),
  waitlistControllers.exportWaitlistExcel
)

export const waitlistRoutes = router
