import { Document, Types } from 'mongoose'
import type { TDiscountType } from '../PromoCode/promo-code.constants'

export interface IPromoCodeUsage {
  user: Types.ObjectId
  promoCode: Types.ObjectId
  campaign: Types.ObjectId

  discountType: TDiscountType
  discountValue: number // e.g. 10 (%) or 20 ($)

  originalAmount: number // Before discount
  discountAmount: number // Amount deducted
  finalAmount: number // Amount after discount

  usedAt: Date
}

export interface IPromoCodeUsageDoc extends Document, IPromoCodeUsage {}

// export interface IPromoCodeUsageModel extends Model<IPromoCodeUsageDoc> {
//   getById(id: string): Promise<IPromoCodeUsage | null>
// }
