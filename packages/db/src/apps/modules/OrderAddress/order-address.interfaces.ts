import { Document, Types } from 'mongoose'

export interface IOrderAddress {
  supporter: Types.ObjectId
  order: Types.ObjectId
  phoneNumber?: string
  addressLine1: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

export interface IOrderAddressDoc extends Document, IOrderAddress {}

// export interface IOrderAddressModel extends Model<IOrderAddressDoc> {
//   getById(id: string): Promise<IOrderAddress | null>
// }
