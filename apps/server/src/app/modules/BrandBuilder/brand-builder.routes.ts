import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { brandBuilderControllers } from './brand-builder.controllers'
import { brandBuilderValidations } from './brand-builder.validations'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'
import { multerFactory } from 'packages/media-hub/src'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.ORGANIZER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 10,
  }).fields([
    {
      name: 'brandImage',
      maxCount: 1,
    },
    {
      name: 'brandLogo',
      maxCount: 1,
    },
  ]),
  validateRequest(brandBuilderValidations.createBrandBuilderSchema),
  brandBuilderControllers.createBrandBuilder
)

router.get(
  '/all',
  validateRequest(brandBuilderValidations.getAllBrandBuilderSchema),
  brandBuilderControllers.getAllBrandBuilder
)

router.get(
  '/my',
  auth(AuthRoles.ORGANIZER),
  validateRequest(brandBuilderValidations.getAllBrandBuilderSchema),
  brandBuilderControllers.getCustomerBrandBuilders
)

export const brandBuilderRoutes = router
