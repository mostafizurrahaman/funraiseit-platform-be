import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { orderAddressControllers } from './order-address.controllers'
import { orderAddressValidations } from './order-address.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(orderAddressValidations.createOrderAddressSchema),
  orderAddressControllers.createOrderAddress
)

router.patch(
  '/:id',
  validateRequest(orderAddressValidations.updateOrderAddressSchema),
  orderAddressControllers.updateOrderAddress
)

router.get(
  '/all',
  validateRequest(orderAddressValidations.getAllOrderAddressSchema),
  orderAddressControllers.getAllOrderAddress
)

router.get(
  '/:id',
  validateRequest(orderAddressValidations.getOrderAddressByIdSchema),
  orderAddressControllers.getOrderAddressById
)

router.delete(
  '/:id',
  validateRequest(orderAddressValidations.deleteOrderAddressByIdSchema),
  orderAddressControllers.deleteOrderAddressById
)

export const orderAddressRoutes = router