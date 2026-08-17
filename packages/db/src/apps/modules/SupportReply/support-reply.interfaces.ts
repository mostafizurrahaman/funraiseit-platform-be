import { Document, Types } from 'mongoose'

export interface ISupportReply {
  supportId: Types.ObjectId
  replyMessage: string
}

export interface ISupportReplyDoc extends Document, ISupportReply {}

// export interface ISupportReplyModel extends Model<ISupportReplyDoc> {
//   getById(id: string): Promise<ISupportReply | null>
// }
