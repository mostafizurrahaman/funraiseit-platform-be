import { Document, Model } from 'mongoose'
import type { TWaitlistStatus } from './waitlist.constants'

export interface IWaitlist {
  email: string
  phoneNumber?: string | null
  status: TWaitlistStatus
  memberNumber: number
  formattedMemberNumber: string
  isVip: boolean
  vipClaimedAt?: Date | null
  vipSkippedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export interface IWaitlistDoc extends Document, IWaitlist {}

export interface IWaitlistModel extends Model<IWaitlistDoc> {
  getNextMemberNumber(): Promise<{ memberNumber: number; formattedMemberNumber: string }>
}
