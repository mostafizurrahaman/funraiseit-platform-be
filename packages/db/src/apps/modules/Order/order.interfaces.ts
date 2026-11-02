import { Document, Types } from 'mongoose'
import type { TOrderStatus, TShippingType } from './order.constants'
import type { IDigitalProduct, IPhysicalProduct } from '../Product'

export interface IOrder {
  campaign: Types.ObjectId
  supporter: Types.ObjectId
  shippingType: TShippingType
  customerName: string
  customerPhone: string
  subTotal: number
  shippingAmount: number
  gstAmount: number;
  stripeFeeAmount: number;
  totalAmount: number
  stripeFeePercentage: number
  platformFeePercentage: number
  stripeTaxCalculationId?: string;
  stripeTaxTransactionId?:string;
  status: TOrderStatus
}

export interface IOrderDoc extends Document, IOrder {}

// export interface IOrderModel extends Model<IOrderDoc> {
//   getById(id: string): Promise<IOrder | null>
// }
export type ProductDoc = IPhysicalProduct | IDigitalProduct
