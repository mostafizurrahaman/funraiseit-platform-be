import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { accountControllers } from './account.controllers'
import { accountValidations } from './account.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(accountValidations.createAccountSchema),
  accountControllers.createAccount
)

router.patch(
  '/:id',
  validateRequest(accountValidations.updateAccountSchema),
  accountControllers.updateAccount
)

router.get(
  '/all',
  validateRequest(accountValidations.getAllAccountSchema),
  accountControllers.getAllAccount
)

router.get(
  '/:id',
  validateRequest(accountValidations.getAccountByIdSchema),
  accountControllers.getAccountById
)

router.delete(
  '/:id',
  validateRequest(accountValidations.deleteAccountByIdSchema),
  accountControllers.deleteAccountById
)

export const accountRoutes = router