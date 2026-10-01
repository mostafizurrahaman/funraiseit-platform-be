import { customAlphabet } from 'nanoid'
import { Campaign } from 'packages/db/src'
import configs from '@app/configs'
import { renderEmail, CampaignLiveEmail } from 'packages/email-templates/src'
import { sendEmail } from 'packages/email-sender/src'
import { sendSms } from '@app/libs/send-sms'
import { logger } from '@app/libs/logger'

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 7)

export const generateCampaignCode = () => {
  return `CPN-${nanoid()}`
}

export const generateUniqueCampaignCode = async (): Promise<string> => {
  let code: string

  do {
    code = generateCampaignCode()
  } while (await Campaign.exists({ campaignCode: code }))

  return code
}

export const sendCampaignLiveNotification = async (
  campaign: { name?: string; campaignCode?: string },
  organizer: { name?: string; email?: string; phoneNumber?: string }
) => {
  try {
    const siteLogo = configs.site.logo as string | undefined
    const siteName = configs.site.name || 'FunRaisingIt'
    const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'
    const campaignLink = campaign.campaignCode
      ? `${clientUrl}/campaign/${campaign.campaignCode}`
      : clientUrl

    const promises: Promise<unknown>[] = []

    // 1. Send Campaign Live Email
    if (organizer.email) {
      promises.push(
        (async () => {
          try {
            const htmlTemplate = await renderEmail(
              CampaignLiveEmail({
                organizerName: organizer.name!,
                campaignName: campaign.name!,
                campaignCode: campaign.campaignCode!,
                companyLogo: siteLogo!,
              })
            )

            await sendEmail({
              to: organizer.email!,
              subject: '🎉 YOUR CAMPAIGN IS LIVE!',
              html: htmlTemplate.html,
              text: htmlTemplate.text,
            })
          } catch (emailErr) {
            logger.error('Failed to send CampaignLiveEmail:', emailErr)
          }
        })()
      )
    }

    // 2. Send Campaign Live SMS
    if (organizer.phoneNumber) {
      const smsText = `🎉 Hi ${organizer.name || 'there'}, your campaign "${campaign.name}" is officially LIVE on ${siteName}! Campaign Code: ${campaign.campaignCode}. Start sharing: ${campaignLink}`
      promises.push(
        (async () => {
          try {
            await sendSms(organizer.phoneNumber!, smsText)
          } catch (smsErr) {
            logger.error('Failed to send CampaignLive SMS:', smsErr)
          }
        })()
      )
    }

    await Promise.allSettled(promises)
  } catch (err) {
    logger.error('Error in sendCampaignLiveNotification:', err)
  }
}
