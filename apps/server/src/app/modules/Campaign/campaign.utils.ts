import { customAlphabet } from 'nanoid'
import { Campaign } from 'packages/db/src'

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
