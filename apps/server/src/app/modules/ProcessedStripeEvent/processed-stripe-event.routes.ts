import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { processedStripeEventControllers } from './processed-stripe-event.controllers'
import { processedStripeEventValidations } from './processed-stripe-event.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(processedStripeEventValidations.createProcessedStripeEventSchema),
  processedStripeEventControllers.createProcessedStripeEvent
)

router.patch(
  '/:id',
  validateRequest(processedStripeEventValidations.updateProcessedStripeEventSchema),
  processedStripeEventControllers.updateProcessedStripeEvent
)

router.get(
  '/all',
  validateRequest(processedStripeEventValidations.getAllProcessedStripeEventSchema),
  processedStripeEventControllers.getAllProcessedStripeEvent
)

router.get(
  '/:id',
  validateRequest(processedStripeEventValidations.getProcessedStripeEventByIdSchema),
  processedStripeEventControllers.getProcessedStripeEventById
)

router.delete(
  '/:id',
  validateRequest(processedStripeEventValidations.deleteProcessedStripeEventByIdSchema),
  processedStripeEventControllers.deleteProcessedStripeEventById
)

export const processedStripeEventRoutes = router