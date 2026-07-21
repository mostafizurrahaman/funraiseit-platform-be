import { Document, Types } from 'mongoose'
import type { TPaymentStatusType, TPaymentType } from './payment.constants'
import type { TCurrency } from '../Account'

// General Payment Interface:
export interface IPayment {
  organizer: Types.ObjectId
  campaign: Types.ObjectId
  paymentType: TPaymentType
  status: TPaymentStatusType
  currency: TCurrency
  amount: number

  stripeCheckoutSessionId?: string
  stripePaymentIntentId?: string
  stripeChargeId?: string
  stripeApplicationFeeId?: string
  stripeBalanceTransactionId?: string
  paidAt?: Date
}

export interface IDonationPayment extends IPayment {
  supporter: Types.ObjectId
  donation: Types.ObjectId
}
export interface IOrderPayment extends IPayment {
  supporter: Types.ObjectId
  order: Types.ObjectId
}

export interface IPaymentDoc extends Document, IPayment {}

export interface IDonationPaymentDoc extends IDonationPayment, Document {}

export interface IOrderPaymentDoc extends IOrderPayment, Document {}

// export interface IPaymentModel extends Model<IPaymentDoc> {
//   getById(id: string): Promise<IPayment | null>
// }
