import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { usersControllers } from './users.controllers'
import { usersValidations } from './users.validations'
import { multerFactory } from '@repo/media-hub'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.post(
  '/',
  multerFactory({
    category: 'image',
    maxSizeInMB: 10,
  }).single('profileImage'),
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(usersValidations.createUsersSchema),
  usersControllers.createUsers
)

router.patch(
  '/:id',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(usersValidations.updateUsersSchema),
  usersControllers.updateUsers
)

router.get(
  '/all',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(usersValidations.getAllUsersSchema),
  usersControllers.getAllUsers
)

router.get(
  '/all-orgs',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(usersValidations.getAllOrganizationSchema),
  usersControllers.getAllOrganizations
)

router.get(
  '/:id',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(usersValidations.getUsersByIdSchema),
  usersControllers.getUsersById
)

// router.delete(
//   '/:id',
//   validateRequest(usersValidations.deleteUsersByIdSchema),
//   usersControllers.deleteUsersById
// )

export const usersRoutes = router
