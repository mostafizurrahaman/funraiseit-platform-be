import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { supportReplyControllers } from './support-reply.controllers'
import { supportReplyValidations } from './support-reply.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(supportReplyValidations.createSupportReplySchema),
  supportReplyControllers.createSupportReply
)

router.patch(
  '/:id',
  validateRequest(supportReplyValidations.updateSupportReplySchema),
  supportReplyControllers.updateSupportReply
)

router.get(
  '/all',
  validateRequest(supportReplyValidations.getAllSupportReplySchema),
  supportReplyControllers.getAllSupportReply
)

router.get(
  '/:id',
  validateRequest(supportReplyValidations.getSupportReplyByIdSchema),
  supportReplyControllers.getSupportReplyById
)

router.delete(
  '/:id',
  validateRequest(supportReplyValidations.deleteSupportReplyByIdSchema),
  supportReplyControllers.deleteSupportReplyById
)

export const supportReplyRoutes = router