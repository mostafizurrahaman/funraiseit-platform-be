import { Document, Types } from 'mongoose'
import type { TProductType } from './product.constants'

export interface IProduct {
  campaign: Types.ObjectId
  name: string
  description?: string | null
  price: number
  productImage: string
  productType: TProductType
}

export interface IPhysicalProduct extends IProduct, Document {
  stock?: number | null
  sku?: string
  weight?: string
}

export interface IDigitalProduct extends IProduct, Document {
  digitalFileUrl: string
  digitalFileName: string
  downloadLimit: number
}

export interface IProductDoc extends Document, IProduct {}

// export interface IProductModel extends Model<IProductDoc> {
//   getById(id: string): Promise<IProduct | null>
// }
