import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { contentControllers } from './content.controllers'
import { contentValidations } from './content.validations'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.patch(
  '/',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(contentValidations.updateContentSchema),
  contentControllers.updateContent
)

router.get(
  '/:contentType',
  validateRequest(contentValidations.getContentByIdSchema),
  contentControllers.getContentByContentType
)

export const contentRoutes = router
