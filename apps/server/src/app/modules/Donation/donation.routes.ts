import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { donationControllers } from './donation.controllers'
import { donationValidations } from './donation.validations'
import { AuthRoles } from '@repo/db'
import { auth } from '../../middlewares/auth'

const router: Router = express.Router()

router.post(
  '/',
  validateRequest(donationValidations.createDonationSchema),
  donationControllers.createDonation
)

router.get(
  '/all',
  auth(AuthRoles.ORGANIZER),
  validateRequest(donationValidations.getAllDonationSchema),
  donationControllers.getAllDonation
)

router.get(
  '/overview',
  auth(AuthRoles.ORGANIZER),
  validateRequest(donationValidations.getDonationOverviewByCampaignIdSchema),
  donationControllers.getDonationOverviewByCampaignId
)

router.get(
  '/:id',
  validateRequest(donationValidations.getDonationByIdSchema),
  donationControllers.getDonationById
)

router.delete(
  '/:id',
  validateRequest(donationValidations.deleteDonationByIdSchema),
  donationControllers.deleteDonationById
)

export const donationRoutes = router
