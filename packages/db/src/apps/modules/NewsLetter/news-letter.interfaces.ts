import { Document } from 'mongoose'

export interface INewsLetter {
  email: string
  subscribedAt: Date
}

export interface INewsLetterDoc extends Document, INewsLetter {}

// export interface INewsLetterModel extends Model<INewsLetterDoc> {
//   getById(id: string): Promise<INewsLetter | null>
// }
