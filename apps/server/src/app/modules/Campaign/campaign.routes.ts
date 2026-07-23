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

router.post(
  '/:id/add-product',
  auth(AuthRoles.ORGANIZER),

  multerFactory({
    category: [
      'image',
      'audio',
      'video',
      'archive',
      'spreadsheet',
      'document',
      'presentation',
      'text',
    ],
    maxSizeInMB: 50,
  }).fields([
    {
      name: 'productImage',
      maxCount: 1,
    },
    {
      name: 'downloadFiles',
      maxCount: 1,
    },
  ]),
  validateRequest(campaignValidations.addProductIntoCampaignSchema),
  campaignControllers.addProductIntoCampaign
)

router.get(
  '/:id/preview',
  auth(AuthRoles.ORGANIZER),
  validateRequest(campaignValidations.getCampaignPreviewByID),
  campaignControllers.getCampaignPreview
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
