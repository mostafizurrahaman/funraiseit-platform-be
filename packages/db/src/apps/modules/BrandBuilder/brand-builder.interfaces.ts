import { Document, Types } from 'mongoose'
import type { TBrandBuilderBuilderStatusType } from './brand-builder.constants'

export interface IBrandBuilder {
  organizer: Types.ObjectId
  products: string[]
  businessName: string
  sellingItem: string
  brandImage: string
  brandLogo: string
  colors: string[]
  brandStyle: string
  budget: string
  brandBuilderFee: number
  paidAmount: number
  status: TBrandBuilderBuilderStatusType
  paidAt?: Date
  failedAt?: Date
  failedReason?: string
}

export interface IBrandBuilderDoc extends Document, IBrandBuilder {}

// export interface IBrandBuilderModel extends Model<IBrandBuilderDoc> {
//   getById(id: string): Promise<IBrandBuilder | null>
// }
