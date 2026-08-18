import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { orderControllers } from './order.controllers'
import { orderValidations } from './order.validations'
import { AuthRoles } from '@repo/db'
import { auth } from '../../middlewares/auth'

const router: Router = express.Router()

router.post('/', validateRequest(orderValidations.createOrderSchema), orderControllers.createOrder)

router.post(
  '/preview',
  validateRequest(orderValidations.previewOrderSchema),
  orderControllers.previewOrder
)

router.get(
  '/all',
  auth(AuthRoles.ORGANIZER),
  validateRequest(orderValidations.getAllOrderSchema),
  orderControllers.getAllOrder
)

router.get(
  '/overview',
  auth(AuthRoles.ORGANIZER),
  validateRequest(orderValidations.getCampaignOrderOverview),
  orderControllers.getCampaignOrderOverview
)

router.get(
  '/:id',
  auth(AuthRoles.ORGANIZER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.getOrderByIdSchema),
  orderControllers.getOrderById
)

// Item level routes:
router.patch(
  '/item/:itemId/cancel',
  auth(AuthRoles.ORGANIZER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.cancelOrderItemSchema),
  orderControllers.cancelOrderItem
)

router.patch(
  '/item/:itemId/deliver-physical',
  auth(AuthRoles.ORGANIZER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.deliverPhysicalItemSchema),
  orderControllers.deliverPhysicalItem
)

router.patch(
  '/item/:itemId/fulfill-digital',
  auth(AuthRoles.ORGANIZER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.fulfillDigitalItemSchema),
  orderControllers.fulfillDigitalItem
)

router.patch(
  '/item/:itemId/status',
  auth(AuthRoles.ORGANIZER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.updateOrderItemStatusSchema),
  orderControllers.updateOrderItemStatus
)

// Order level status & delivery routes:
router.patch(
  '/:id/cancel',
  auth(AuthRoles.ORGANIZER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.cancelOrderSchema),
  orderControllers.cancelOrder
)

router.patch(
  '/:id/deliver-all',
  auth(AuthRoles.ORGANIZER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.deliverAllOrderItemsSchema),
  orderControllers.deliverAllOrderItems
)

router.patch(
  '/:id/status',
  auth(AuthRoles.ORGANIZER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(orderValidations.updateOrderStatusSchema),
  orderControllers.updateOrderStatus
)

export const orderRoutes = router
