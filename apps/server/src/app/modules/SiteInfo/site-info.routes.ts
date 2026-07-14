import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { siteInfoControllers } from './site-info.controllers'
import { siteInfoValidations } from './site-info.validations'

const router : Router = express.Router()

router.post(
  '/',
  validateRequest(siteInfoValidations.createSiteInfoSchema),
  siteInfoControllers.createSiteInfo
)

router.patch(
  '/:id',
  validateRequest(siteInfoValidations.updateSiteInfoSchema),
  siteInfoControllers.updateSiteInfo
)

router.get(
  '/all',
  validateRequest(siteInfoValidations.getAllSiteInfoSchema),
  siteInfoControllers.getAllSiteInfo
)

router.get(
  '/:id',
  validateRequest(siteInfoValidations.getSiteInfoByIdSchema),
  siteInfoControllers.getSiteInfoById
)

router.delete(
  '/:id',
  validateRequest(siteInfoValidations.deleteSiteInfoByIdSchema),
  siteInfoControllers.deleteSiteInfoById
)

export const siteInfoRoutes = router