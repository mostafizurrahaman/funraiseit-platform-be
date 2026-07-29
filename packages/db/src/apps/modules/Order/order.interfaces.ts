import { Document, Types } from 'mongoose'
import type { TOrderStatus } from './order.constants'

export interface IOrder {
  campaign: Types.ObjectId
  supporter: Types.ObjectId
  subTotal: number
  totalAmount: number
  shippingAmount: number
  stripeFeePercentage: number
  platformFeePercentage: number
  status: TOrderStatus
}

export interface IOrderDoc extends Document, IOrder {}



// export interface IOrderModel extends Model<IOrderDoc> {
//   getById(id: string): Promise<IOrder | null>
// }
