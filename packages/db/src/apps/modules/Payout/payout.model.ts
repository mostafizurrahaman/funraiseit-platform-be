import { Schema, model } from 'mongoose'
  import type { IPayoutDoc } from './payout.interfaces'

const payoutSchema = new Schema<IPayoutDoc>(
  {
    name: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// payoutSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Payout = model<IPayoutDoc>(
  'Payout',
  payoutSchema
)