import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { promoCodeUsageControllers } from './promo-code-usage.controllers'
import { promoCodeUsageValidations } from './promo-code-usage.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(promoCodeUsageValidations.createPromoCodeUsageSchema),
  promoCodeUsageControllers.createPromoCodeUsage
)

router.patch(
  '/:id',
  validateRequest(promoCodeUsageValidations.updatePromoCodeUsageSchema),
  promoCodeUsageControllers.updatePromoCodeUsage
)

router.get(
  '/all',
  validateRequest(promoCodeUsageValidations.getAllPromoCodeUsageSchema),
  promoCodeUsageControllers.getAllPromoCodeUsage
)

router.get(
  '/:id',
  validateRequest(promoCodeUsageValidations.getPromoCodeUsageByIdSchema),
  promoCodeUsageControllers.getPromoCodeUsageById
)

router.delete(
  '/:id',
  validateRequest(promoCodeUsageValidations.deletePromoCodeUsageByIdSchema),
  promoCodeUsageControllers.deletePromoCodeUsageById
)

export const promoCodeUsageRoutes = router