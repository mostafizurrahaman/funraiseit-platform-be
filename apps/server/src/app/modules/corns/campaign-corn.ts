import cron from 'node-cron'
import { campaignServices } from '../Campaign/campaign.services'
import { logger } from '@app/libs/logger'

export const startCampaignCron = () => {
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    logger.info('Campaign corn running..........')
    try {
      await campaignServices.cronJobToCompleteCampaign()
    } catch (error) {
      logger.error('Campaign complete corn error', error)
    }
  })
}
