import { Schema, model } from 'mongoose'
  import type { ISupportReplyDoc } from './support-reply.interfaces'

const supportReplySchema = new Schema<ISupportReplyDoc>(
  {
    name: {
      type: String,
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