import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { productControllers } from './product.controllers'
import { productValidations } from './product.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(productValidations.createProductSchema),
  productControllers.createProduct
)

router.patch(
  '/:id',
  validateRequest(productValidations.updateProductSchema),
  productControllers.updateProduct
)

router.get(
  '/all',
  validateRequest(productValidations.getAllProductSchema),
  productControllers.getAllProduct
)

router.get(
  '/:id',
  validateRequest(productValidations.getProductByIdSchema),
  productControllers.getProductById
)

router.delete(
  '/:id',
  validateRequest(productValidations.deleteProductByIdSchema),
  productControllers.deleteProductById
)

export const productRoutes = router