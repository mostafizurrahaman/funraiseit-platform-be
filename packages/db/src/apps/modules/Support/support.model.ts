import { Schema, Types, model } from 'mongoose'
import type { ISupportDoc } from './support.interfaces'
import { supportStatus, supportStatusValues } from './support.constants'

const supportSchema = new Schema<ISupportDoc>(
  {
    ticketNo: {
      type: String,
    },
    user: {
      type: Types.ObjectId,
      ref: 'User',
    },
    campaign: {
      type: Types.ObjectId,
      ref: 'Campaign',
    },
    email: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: supportStatusValues,
      default: supportStatus.OPEN,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// supportSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Support = model<ISupportDoc>('Support', supportSchema)
