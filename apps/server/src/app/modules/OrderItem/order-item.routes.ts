import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { orderItemControllers } from './order-item.controllers'
import { orderItemValidations } from './order-item.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(orderItemValidations.createOrderItemSchema),
  orderItemControllers.createOrderItem
)

router.patch(
  '/:id',
  validateRequest(orderItemValidations.updateOrderItemSchema),
  orderItemControllers.updateOrderItem
)

router.get(
  '/all',
  validateRequest(orderItemValidations.getAllOrderItemSchema),
  orderItemControllers.getAllOrderItem
)

router.get(
  '/:id',
  validateRequest(orderItemValidations.getOrderItemByIdSchema),
  orderItemControllers.getOrderItemById
)

router.delete(
  '/:id',
  validateRequest(orderItemValidations.deleteOrderItemByIdSchema),
  orderItemControllers.deleteOrderItemById
)

export const orderItemRoutes = router