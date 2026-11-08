import { customAlphabet } from 'nanoid'
import { Campaign } from 'packages/db/src'
import configs from '@app/configs'
import {
  renderEmail,
  CampaignLiveEmail,
  CampaignLaunchedAdminNotificationEmail,
} from 'packages/email-templates/src'
import { sendEmail } from 'packages/email-sender/src'
import { sendSms } from '@app/libs/send-sms'
import { logger } from '@app/libs/logger'
import { getAdminEmails } from '@app/libs/get-admin-emails'

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

export interface SendCampaignLiveOptions {
  isFreeLaunch?: boolean | undefined
  promoCode?: string | undefined
  launchFee?: number | undefined
}

export const sendCampaignLiveNotification = async (
  campaign: {
    name?: string | undefined
    campaignCode?: string | undefined
    goalAmount?: number | undefined
    launchFee?: number | undefined
    finalLaunchFee?: number | undefined
  },
  organizer: { name?: string; email?: string; phoneNumber?: string },
  options?: SendCampaignLiveOptions
) => {
  try {
    const siteLogo = configs.site.logo as string | undefined
    const siteName = configs.site.name || 'FunRaisingIt'
    const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'
    const campaignLink = campaign.campaignCode
      ? `${clientUrl}/campaign/${campaign.campaignCode}`
      : clientUrl

    const promises: Promise<unknown>[] = []

    // 1. Send Campaign Live Email to Organizer
    if (organizer.email) {
      promises.push(
        (async () => {
          try {
            const htmlTemplate = await renderEmail(
              CampaignLiveEmail({
                organizerName: organizer.name || 'Organizer',
                campaignName: campaign.name || 'Your Campaign',
                campaignCode: campaign.campaignCode || '',
                companyLogo: siteLogo,
              })
            )

            await sendEmail({
              to: organizer.email!,
              subject: `Your campaign "${campaign.name}" is now live on ${siteName}`,
              html: htmlTemplate.html,
              text: htmlTemplate.text,
              fromName: siteName,
              replyTo: configs.site.supportEmail || undefined,
            })
          } catch (emailErr) {
            logger.error('Failed to send CampaignLiveEmail to organizer:', emailErr)
          }
        })()
      )
    }

    // 2. Send Campaign Live SMS to Organizer
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

    // 3. Send Notification to Admin(s)
    promises.push(
      (async () => {
        try {
          const adminEmails = await getAdminEmails()
          if (!adminEmails || adminEmails.length === 0) return

          const adminTemplate = await renderEmail(
            CampaignLaunchedAdminNotificationEmail({
              campaignName: campaign.name || 'Campaign',
              campaignCode: campaign.campaignCode || '',
              organizerName: organizer.name || 'Organizer',
              organizerEmail: organizer.email || '',
              organizerPhone: organizer.phoneNumber,
              goalAmount: campaign.goalAmount,
              launchFee: options?.launchFee ?? campaign.finalLaunchFee ?? campaign.launchFee ?? 0,
              isFreeLaunch: options?.isFreeLaunch || false,
              promoCode: options?.promoCode,
              launchedAt: new Date().toLocaleString(),
              campaignUrl: campaignLink,
              adminDashboardUrl: `${clientUrl}/admin`,
              companyName: siteName,
              companyLogo: siteLogo,
            })
          )

          await Promise.allSettled(
            adminEmails.map((adminEmail) =>
              sendEmail({
                to: adminEmail,
                subject: `New campaign published on ${siteName}: "${campaign.name}"`,
                html: adminTemplate.html,
                text: adminTemplate.text,
                fromName: siteName,
                replyTo: configs.site.supportEmail || undefined,
              })
            )
          )
        } catch (adminErr) {
          logger.error('Failed to send campaign launched email to admin:', adminErr)
        }
      })()
    )

    await Promise.allSettled(promises)
  } catch (err) {
    logger.error('Error in sendCampaignLiveNotification:', err)
  }
}
