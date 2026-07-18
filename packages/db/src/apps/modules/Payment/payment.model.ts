import { Schema, model } from 'mongoose'
  import type { IPaymentDoc } from './payment.interfaces'

const paymentSchema = new Schema<IPaymentDoc>(
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
// paymentSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Payment = model<IPaymentDoc>(
  'Payment',
  paymentSchema
)