import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { orderControllers } from './order.controllers'
import { orderValidations } from './order.validations'
import { AuthRoles } from '@repo/db'
import { auth } from '../../middlewares/auth'

const router: Router = express.Router()

router.post('/', validateRequest(orderValidations.createOrderSchema), orderControllers.createOrder)

router.get('/', validateRequest(orderValidations.previewOrderSchema), orderControllers.previewOrder)

router.patch(
  '/:id',
  validateRequest(orderValidations.updateOrderSchema),
  orderControllers.updateOrder
)

router.get(
  '/all',
  auth(AuthRoles.ORGANIZER),
  validateRequest(orderValidations.getAllOrderSchema),
  orderControllers.getAllOrder
)

router.get(
  '/:id',
  validateRequest(orderValidations.getOrderByIdSchema),
  orderControllers.getOrderById
)

router.delete(
  '/:id',
  validateRequest(orderValidations.deleteOrderByIdSchema),
  orderControllers.deleteOrderById
)

router.get(
  '/overview',
  auth(AuthRoles.ORGANIZER),
  validateRequest(orderValidations.getCampaignOrderOverview),
  orderControllers.getCampaignOrderOverview
)

export const orderRoutes = router
