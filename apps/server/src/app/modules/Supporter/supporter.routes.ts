import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { supporterControllers } from './supporter.controllers'
import { supporterValidations } from './supporter.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(supporterValidations.createSupporterSchema),
  supporterControllers.createSupporter
)

router.patch(
  '/:id',
  validateRequest(supporterValidations.updateSupporterSchema),
  supporterControllers.updateSupporter
)

router.get(
  '/all',
  validateRequest(supporterValidations.getAllSupporterSchema),
  supporterControllers.getAllSupporter
)

router.get(
  '/:id',
  validateRequest(supporterValidations.getSupporterByIdSchema),
  supporterControllers.getSupporterById
)

router.delete(
  '/:id',
  validateRequest(supporterValidations.deleteSupporterByIdSchema),
  supporterControllers.deleteSupporterById
)

export const supporterRoutes = router