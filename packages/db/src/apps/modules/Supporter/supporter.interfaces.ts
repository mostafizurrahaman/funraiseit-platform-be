import { Document } from 'mongoose'

export interface ISupporter {
  name: string
  email: string
  phoneNumber?: string
}

export interface ISupporterDoc extends Document, ISupporter {}

// export interface ISupporterModel extends Model<ISupporterDoc> {
//   getById(id: string): Promise<ISupporter | null>
// }
