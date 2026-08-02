import { Schema, model } from 'mongoose'
import type { IOrderDoc } from './order.interfaces'
import { OrderStatus, OrderStatusValues, shippingTypesValues } from './order.constants'

const orderSchema = new Schema<IOrderDoc>(
  {
    campaign: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    supporter: {
      type: Schema.Types.ObjectId,
      ref: 'Supporter',
      required: true,
    },
    customerName: {
      type: String,
    },
    customerPhone: {
      type: String,
    },
    shippingType: {
      type: String,
      enum: shippingTypesValues,
      required: true,
    },
    subTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    stripeFeePercentage: {
      type: Number,
      default: 2.9,
      min: 0,
    },
    platformFeePercentage: {
      type: Number,
      default: 6,
      min: 0,
    },
    status: {
      type: String,
      enum: OrderStatusValues,
      default: OrderStatus.PENDING,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// orderSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Order = model<IOrderDoc>('Order', orderSchema)
