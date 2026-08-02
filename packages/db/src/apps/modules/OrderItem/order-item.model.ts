import { Schema, model } from 'mongoose'
import type { IOrderItemDoc } from './order-item.interfaces'
import { OrderItemStatus, orderItemStatusValues } from './order-item.constants'

const orderItemSchema = new Schema<IOrderItemDoc>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      min: 0,
    },
    unitPrice: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: orderItemStatusValues,
      default: OrderItemStatus.PENDING,
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

export const OrderItem = model<IOrderItemDoc>('OrderItem', orderItemSchema)
