import { Schema, model } from 'mongoose'
import type { IPromoCodeDoc } from './promo-code.interfaces'
import { discountTypeValues } from './promo-code.constants'

const promoCodeSchema = new Schema<IPromoCodeDoc>(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      unique: true,
    },
    discountType: {
      type: String,
      enum: discountTypeValues,
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 1,
    },
    usedCount: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// promoCodeSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const PromoCode = model<IPromoCodeDoc>('PromoCode', promoCodeSchema)
