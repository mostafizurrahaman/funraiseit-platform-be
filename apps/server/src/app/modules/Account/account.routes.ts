import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { accountControllers } from './account.controllers'
import { accountValidations } from './account.validations'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.post('/connect', auth(AuthRoles.ORGANIZER), accountControllers.connectStripeAccount)

router.get(
  '/:id',
  validateRequest(accountValidations.getAccountByIdSchema),
  accountControllers.getAccountById
)

export const accountRoutes = router
