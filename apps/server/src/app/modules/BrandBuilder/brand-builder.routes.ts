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

router.patch(
  '/:id',
  validateRequest(brandBuilderValidations.updateBrandBuilderSchema),
  brandBuilderControllers.updateBrandBuilder
)

router.get(
  '/all',
  validateRequest(brandBuilderValidations.getAllBrandBuilderSchema),
  brandBuilderControllers.getAllBrandBuilder
)

router.get(
  '/:id',
  validateRequest(brandBuilderValidations.getBrandBuilderByIdSchema),
  brandBuilderControllers.getBrandBuilderById
)

router.delete(
  '/:id',
  validateRequest(brandBuilderValidations.deleteBrandBuilderByIdSchema),
  brandBuilderControllers.deleteBrandBuilderById
)

export const brandBuilderRoutes = router
