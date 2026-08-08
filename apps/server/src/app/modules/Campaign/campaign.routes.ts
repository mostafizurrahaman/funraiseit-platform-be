import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { campaignControllers } from './campaign.controllers'
import { campaignValidations } from './campaign.validations'
import { multerFactory } from 'packages/media-hub/src'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.ORGANIZER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).single('thumbnail'),
  validateRequest(campaignValidations.createCampaignSchema),
  campaignControllers.createCampaign
)

router.post('/story', campaignControllers.generateCampaignStory)

router.post(
  '/:id/preview',
  auth(AuthRoles.ORGANIZER),
  validateRequest(campaignValidations.getCampaignPreviewByID),
  campaignControllers.getCampaignPreview
)

router.post(
  '/:id/launch',
  auth(AuthRoles.ORGANIZER),
  validateRequest(campaignValidations.launchCampaignByID),
  campaignControllers.launchCampaignByID
)

router.patch(
  '/:id',
  auth(AuthRoles.ORGANIZER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).single('thumbnail'),
  validateRequest(campaignValidations.updateCampaignSchema),
  campaignControllers.updateCampaign
)

router.get(
  '/all',
  validateRequest(campaignValidations.getAllCampaignSchema),
  campaignControllers.getAllCampaign
)

router.get(
  '/all/active',
  validateRequest(campaignValidations.getAllActiveCampaign),
  campaignControllers.getAllActiveCampaign
)

router.get(
  '/:id',
  validateRequest(campaignValidations.getCampaignByIdSchema),
  campaignControllers.getCampaignById
)

router.get(
  '/:code/details',
  validateRequest(campaignValidations.getCampaignByCampaignCodeSchema),
  campaignControllers.getCampaignByCampaignCode
)

// router.delete(
//   '/:id',
//   validateRequest(campaignValidations.deleteCampaignByIdSchema),
//   campaignControllers.deleteCampaignById
// )

export const campaignRoutes = router
