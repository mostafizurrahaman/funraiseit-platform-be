import { Schema, model } from 'mongoose'
import type { IOrderAddressDoc } from './order-address.interfaces'

const orderAddressSchema = new Schema<IOrderAddressDoc>(
  {
    supporter: {
      type: Schema.Types.ObjectId,
      ref: 'Supporter',
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    phoneNumber: {
      type: String,
    },
    addressLine1: {
      type: String,
    },
    addressLine2: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    postalCode: {
      type: String,
    },
    country: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// orderAddressSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const OrderAddress = model<IOrderAddressDoc>('OrderAddress', orderAddressSchema)
