import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'
import { multerFactory } from 'packages/media-hub/src'
import { productValidations } from './product.validations'
import { productControllers } from './product.controllers'

const router: Router = express.Router()

router.post(
  '/:id/add-product',
  auth(AuthRoles.ORGANIZER),

  multerFactory({
    category: [
      'image',
      'audio',
      'video',
      'archive',
      'spreadsheet',
      'document',
      'presentation',
      'text',
    ],
    maxSizeInMB: 50,
  }).fields([
    {
      name: 'productImage',
      maxCount: 1,
    },
    {
      name: 'downloadFiles',
      maxCount: 1,
    },
  ]),
  validateRequest(productValidations.addProductIntoCampaignSchema),
  productControllers.addProductIntoCampaign
)

router.patch(
  '/:productId/update-product',
  auth(AuthRoles.ORGANIZER),

  multerFactory({
    category: [
      'image',
      'audio',
      'video',
      'archive',
      'spreadsheet',
      'document',
      'presentation',
      'text',
    ],
    maxSizeInMB: 50,
  }).fields([
    {
      name: 'productImage',
      maxCount: 1,
    },
    {
      name: 'downloadFiles',
      maxCount: 1,
    },
  ]),
  validateRequest(productValidations.updateProductIntoCampaignSchema),
  productControllers.updateProductIntoCampaign
)

router.delete(
  '/:productId',
  auth(AuthRoles.ORGANIZER),
  validateRequest(productValidations.deleteProductByIdSchema),
  productControllers.deleteProductById
)

export const productRoutes = router
