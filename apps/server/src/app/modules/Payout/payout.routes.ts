import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { payoutControllers } from './payout.controllers'
import { payoutValidations } from './payout.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(payoutValidations.createPayoutSchema),
  payoutControllers.createPayout
)

router.patch(
  '/:id',
  validateRequest(payoutValidations.updatePayoutSchema),
  payoutControllers.updatePayout
)

router.get(
  '/all',
  validateRequest(payoutValidations.getAllPayoutSchema),
  payoutControllers.getAllPayout
)

router.get(
  '/:id',
  validateRequest(payoutValidations.getPayoutByIdSchema),
  payoutControllers.getPayoutById
)

router.delete(
  '/:id',
  validateRequest(payoutValidations.deletePayoutByIdSchema),
  payoutControllers.deletePayoutById
)

export const payoutRoutes = router