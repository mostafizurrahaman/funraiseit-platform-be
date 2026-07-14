import { Schema, Types, model } from 'mongoose'
import type { ISiteInfoDoc } from './site-info.interfaces'

const siteInfoSchema = new Schema<ISiteInfoDoc>(
  {
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      required: true,
    },
    campaignLaunchFee: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    brandBuilderPricing: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
    updatedBy: {
      type: Types.ObjectId,
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
// siteInfoSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const SiteInfo = model<ISiteInfoDoc>('SiteInfo', siteInfoSchema)
