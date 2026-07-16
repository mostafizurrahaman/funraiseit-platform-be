import { Document, Types } from 'mongoose'
import type { TCountry, TCurrency } from './account.constants'

export interface IAccount {
  user: Types.ObjectId
  account: string
  country: TCountry
  currency: TCurrency
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  isActive: boolean
}

export interface IAccountDoc extends Document, IAccount {}

// export interface IAccountModel extends Model<IAccountDoc> {
//   getById(id: string): Promise<IAccount | null>
// }
