import { logger } from '@app/libs/logger'
import { startCampaignCron } from './campaign-corn'

export const startCronJobs = () => {
  logger.info('Corn jobs connected ...')
  startCampaignCron()
}
