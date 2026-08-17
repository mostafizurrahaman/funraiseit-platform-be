import { Schema, model } from 'mongoose'
import type { INewsLetterDoc } from './news-letter.interfaces'

const newsLetterSchema = new Schema<INewsLetterDoc>(
  {
    email: {
      type: String,
      required: true,
    },
    subscribedAt: {
      type: Date,
      required: true,
      default: new Date(),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// newsLetterSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const NewsLetter = model<INewsLetterDoc>('NewsLetter', newsLetterSchema)
