import { Document, Types } from 'mongoose'
import type { TOrderItemStatusType } from './order-item.constants'

export interface IOrderItem {
  product: Types.ObjectId
  order: Types.ObjectId
  quantity: number
  unitPrice: number
  status: TOrderItemStatusType
}

export interface IOrderItemDoc extends Document, IOrderItem {}

// export interface IOrderItemModel extends Model<IOrderItemDoc> {
//   getById(id: string): Promise<IOrderItem | null>
// }
