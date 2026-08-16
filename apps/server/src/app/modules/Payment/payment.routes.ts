import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { paymentControllers } from './payment.controllers'
import { paymentValidations } from './payment.validations'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(paymentValidations.getAllPaymentSchema),
  paymentControllers.getAllPayment
)

router.get(
  '/overview',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  paymentControllers.getPaymentOverview
)

export const paymentRoutes = router
