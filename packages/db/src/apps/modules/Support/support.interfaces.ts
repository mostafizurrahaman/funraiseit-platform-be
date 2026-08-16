import { Document, Types } from 'mongoose'
import type { TSupportStatusType } from './support.constants'

export interface ISupport {
  ticketNo: string
  user?: Types.ObjectId
  campaign?: Types.ObjectId
  email: string
  subject: string
  message: string
  status: TSupportStatusType
}

export interface ISupportDoc extends Document, ISupport {}

// export interface ISupportModel extends Model<ISupportDoc> {
//   getById(id: string): Promise<ISupport | null>
// }
