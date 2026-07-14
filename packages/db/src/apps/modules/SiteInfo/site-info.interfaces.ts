import { Document, Types } from 'mongoose'

export interface ISiteInfo {
  platformFee: number
  campaignLaunchFee: number
  brandBuilderPricing: number
  updatedBy: Types.ObjectId
}

export interface ISiteInfoDoc extends Document, ISiteInfo {}

// export interface ISiteInfoModel extends Model<ISiteInfoDoc> {
//   getById(id: string): Promise<ISiteInfo | null>
// }
