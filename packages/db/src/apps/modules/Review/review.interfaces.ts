import type { Types } from 'mongoose'
import { Document } from 'mongoose'

export interface IReview {
  organizer: Types.ObjectId
  rating: number // 1 to 5
  message: string
  isFeatured: boolean
}

export interface IReviewDoc extends Document, IReview {}

// export interface IReviewModel extends Model<IReviewDoc> {
//   getById(id: string): Promise<IReview | null>
// }
