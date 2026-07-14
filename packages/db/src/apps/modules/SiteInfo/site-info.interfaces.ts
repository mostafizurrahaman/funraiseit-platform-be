import { Document, Model } from 'mongoose'

  export interface ISiteInfo  {
    name: string
  }

  export interface ISiteInfoDoc extends Document, ISiteInfo   {}

  // export interface ISiteInfoModel extends Model<ISiteInfoDoc> {
  //   getById(id: string): Promise<ISiteInfo | null>
  // }