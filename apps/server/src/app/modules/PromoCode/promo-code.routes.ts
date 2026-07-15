import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { promoCodeControllers } from './promo-code.controllers'
import { promoCodeValidations } from './promo-code.validations'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(promoCodeValidations.createPromoCodeSchema),
  promoCodeControllers.createPromoCode
)

router.patch(
  '/:id',
  validateRequest(promoCodeValidations.updatePromoCodeSchema),
  promoCodeControllers.updatePromoCode
)

router.get(
  '/all',
  validateRequest(promoCodeValidations.getAllPromoCodeSchema),
  promoCodeControllers.getAllPromoCode
)

router.get(
  '/:id',
  validateRequest(promoCodeValidations.getPromoCodeByIdSchema),
  promoCodeControllers.getPromoCodeById
)

router.delete(
  '/:id',
  validateRequest(promoCodeValidations.deletePromoCodeByIdSchema),
  promoCodeControllers.deletePromoCodeById
)

export const promoCodeRoutes = router
