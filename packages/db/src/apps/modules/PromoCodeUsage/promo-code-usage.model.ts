import { Schema, model } from 'mongoose'
import type { IPromoCodeUsageDoc } from './promo-code-usage.interfaces'
import { discountTypeValues } from '../PromoCode/promo-code.constants'

const promoCodeUsageSchema = new Schema<IPromoCodeUsageDoc>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    promoCode: {
      type: Schema.Types.ObjectId,
      ref: 'PromoCode',
      required: true,
    },
    campaign: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    discountType: {
      type: String,
      enum: discountTypeValues,
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    usedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// promoCodeUsageSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const PromoCodeUsage = model<IPromoCodeUsageDoc>('PromoCodeUsage', promoCodeUsageSchema)
