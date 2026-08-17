import { Schema, model } from 'mongoose'
  import type { ISupportReplyDoc } from './support-reply.interfaces'

const supportReplySchema = new Schema<ISupportReplyDoc>(
  {
    supportId: {
      type: Schema.Types.ObjectId,
      ref: 'Support',
      required: true,
    },
    replyMessage: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// supportReplySchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const SupportReply = model<ISupportReplyDoc>(
  'SupportReply',
  supportReplySchema
)