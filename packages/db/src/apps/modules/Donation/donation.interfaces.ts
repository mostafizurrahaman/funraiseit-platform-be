import { Document, Types } from 'mongoose'
import type { TDonationStatusType } from './donation.constants'

export interface IDonation {
  supporter: Types.ObjectId
  donorPhone: string
  donorName: string
  campaign: Types.ObjectId
  totalAmount: number
  stripeFeePercentage: number
  platformFeePercentage: number
  status: TDonationStatusType
  message: string
}

export interface IDonationDoc extends Document, IDonation {}

// export interface IDonationModel extends Model<IDonationDoc> {
//   getById(id: string): Promise<IDonation | null>
// }
