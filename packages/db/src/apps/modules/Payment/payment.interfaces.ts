import { Document, Model } from 'mongoose'

  export interface IPayment  {
    name: string
  }

  export interface IPaymentDoc extends Document, IPayment   {}

  // export interface IPaymentModel extends Model<IPaymentDoc> {
  //   getById(id: string): Promise<IPayment | null>
  // }