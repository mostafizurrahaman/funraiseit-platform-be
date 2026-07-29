import { Document, Types } from 'mongoose'
import type { TOrderStatus, TShippingType } from './order.constants'
import type { IDigitalProduct, IPhysicalProduct } from '../Product'

export interface IOrder {
  campaign: Types.ObjectId
  supporter: Types.ObjectId
  shippingType: TShippingType
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
export type ProductDoc = IPhysicalProduct | IDigitalProduct
