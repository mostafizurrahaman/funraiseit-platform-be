import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { siteInfoControllers } from './site-info.controllers'
import { siteInfoValidations } from './site-info.validations'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(siteInfoValidations.createSiteInfoSchema),
  siteInfoControllers.createSiteInfo
)

router.get('/', siteInfoControllers.getSiteInfo)

export const siteInfoRoutes = router
