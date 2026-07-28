import { Schema, model } from 'mongoose'
import type { IDonationDoc } from './donation.interfaces'
import { DonationStatus, donationStatusValues } from './donation.constants'

const donationSchema = new Schema<IDonationDoc>(
  {
    supporter: {
      type: Schema.Types.ObjectId,
      ref: 'Supporter',
      required: true,
    },

    donorName: {
      type: String,
    },
    donorPhone: {
      type: String,
    },
    campaign: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    stripeFeePercentage: {
      type: Number,
      default: 0,
    },
    platformFeePercentage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: donationStatusValues,
      default: DonationStatus.PENDING,
    },
    message: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// donationSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Donation = model<IDonationDoc>('Donation', donationSchema)
