import { Document, Types } from 'mongoose'
import type { TCampaignCategory, TCampaignStatus } from './campaign.constants'

export interface ICampaign {
  organizer: Types.ObjectId
  name: string
  campaignCode: string // unique 10 digit code (custom generated)
  campaignCategory: TCampaignCategory
  thumbnail: string

  // Other fields:
  story: string
  fundUsage: string[]
  currency: string // recommended add

  // Amounts:
  goalAmount: number
  raisedAmount: number

  shippingFee: number

  launchFee: number // Amount charged to launch the campaign
  finalLaunchFee: number
  promoCode?: Types.ObjectId
  discountAmount: number

  durationDays: number // days

  // Shipping and pickups:
  allowLocalPickup: boolean
  allowLocalDelivery: boolean
  allowShipping: boolean
  allowDonation: boolean

  // Dates:
  startDate?: Date
  endDate?: Date
  publishedAt?: Date
  endedAt?: Date
  payoutRequestedAt?: Date
  paidOutAt?: Date

  // Status :
  status: TCampaignStatus
}

export interface ICampaignDoc extends Document, ICampaign {}

// export interface ICampaignModel extends Model<ICampaignDoc> {
//   getById(id: string): Promise<ICampaign | null>
// }
