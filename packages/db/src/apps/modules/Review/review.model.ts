import { Schema, model } from 'mongoose'
import type { IReviewDoc } from './review.interfaces'

const reviewSchema = new Schema<IReviewDoc>(
  {
    organizer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    message: {
      type: String,
      required: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// reviewSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Review = model<IReviewDoc>('Review', reviewSchema)
