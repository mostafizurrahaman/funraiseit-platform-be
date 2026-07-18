import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { paymentControllers } from './payment.controllers'
import { paymentValidations } from './payment.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(paymentValidations.createPaymentSchema),
  paymentControllers.createPayment
)

router.patch(
  '/:id',
  validateRequest(paymentValidations.updatePaymentSchema),
  paymentControllers.updatePayment
)

router.get(
  '/all',
  validateRequest(paymentValidations.getAllPaymentSchema),
  paymentControllers.getAllPayment
)

router.get(
  '/:id',
  validateRequest(paymentValidations.getPaymentByIdSchema),
  paymentControllers.getPaymentById
)

router.delete(
  '/:id',
  validateRequest(paymentValidations.deletePaymentByIdSchema),
  paymentControllers.deletePaymentById
)

export const paymentRoutes = router