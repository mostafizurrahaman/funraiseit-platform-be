import { Schema, model } from 'mongoose'
  import type { ISiteInfoDoc } from './site-info.interfaces'

const siteInfoSchema = new Schema<ISiteInfoDoc>(
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
// siteInfoSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const SiteInfo = model<ISiteInfoDoc>(
  'SiteInfo',
  siteInfoSchema
)