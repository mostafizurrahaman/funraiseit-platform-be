import { type TDiscountType } from './promo-code.constants'
import { Document, Types } from 'mongoose'

export interface IPromoCode {
  code: string
  discountType: TDiscountType
  discountValue: number
  usageLimit: number
  usedCount: number
  isActive: boolean
  expiresAt: Date
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface IPromoCodeDoc extends Document, IPromoCode {}

// export interface IPromoCodeModel extends Model<IPromoCodeDoc> {
//   getById(id: string): Promise<IPromoCode | null>
// }
