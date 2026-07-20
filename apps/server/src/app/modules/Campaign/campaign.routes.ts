import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { campaignControllers } from './campaign.controllers'
import { campaignValidations } from './campaign.validations'
import { multerFactory } from 'packages/media-hub/src'

const router: Router = express.Router()

router.post(
  '/',
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).single('thumbnail'),
  validateRequest(campaignValidations.createCampaignSchema),
  campaignControllers.createCampaign
)

router.patch(
  '/:id',
  validateRequest(campaignValidations.updateCampaignSchema),
  campaignControllers.updateCampaign
)

router.get(
  '/all',
  validateRequest(campaignValidations.getAllCampaignSchema),
  campaignControllers.getAllCampaign
)

router.get(
  '/:id',
  validateRequest(campaignValidations.getCampaignByIdSchema),
  campaignControllers.getCampaignById
)

router.delete(
  '/:id',
  validateRequest(campaignValidations.deleteCampaignByIdSchema),
  campaignControllers.deleteCampaignById
)

export const campaignRoutes = router
