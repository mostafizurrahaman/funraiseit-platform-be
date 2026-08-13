import { Document } from 'mongoose'
import type { TContentType } from './content.constants'

export interface IContent {
  content: string
  contentType: TContentType
}

export interface IContentDoc extends Document, IContent {}

// export interface IContentModel extends Model<IContentDoc> {
//   getById(id: string): Promise<IContent | null>
// }
