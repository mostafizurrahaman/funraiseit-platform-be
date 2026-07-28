import { Schema, model } from 'mongoose'
import type { ISupporterDoc } from './supporter.interfaces'

const supporterSchema = new Schema<ISupporterDoc>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// supporterSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Supporter = model<ISupporterDoc>('Supporter', supporterSchema)
