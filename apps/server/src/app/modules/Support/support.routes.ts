import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { supportControllers } from './support.controllers'
import { supportValidations } from './support.validations'

const router: Router = express.Router()

router.post(
  '/',
  validateRequest(supportValidations.createSupportSchema),
  supportControllers.createSupport
)

router.get(
  '/all',
  validateRequest(supportValidations.getAllSupportSchema),
  supportControllers.getAllSupport
)

export const supportRoutes = router
