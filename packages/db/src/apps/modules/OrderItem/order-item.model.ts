import { Schema, model } from 'mongoose'
  import type { IOrderItemDoc } from './order-item.interfaces'

const orderItemSchema = new Schema<IOrderItemDoc>(
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
// orderItemSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const OrderItem = model<IOrderItemDoc>(
  'OrderItem',
  orderItemSchema
)