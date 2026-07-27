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
  expiresAt?: Date
  checkoutUrl?: string
}

export interface IDonationPayment extends IPayment {
  supporter: Types.ObjectId
  donation: Types.ObjectId
}
export interface IOrderPayment extends IPayment {
  supporter: Types.ObjectId
  order: Types.ObjectId
}

export interface ILaunchPayment extends IPayment {
  organizer: Types.ObjectId
}

// Table PaymentBreakdown {
//   id string [pk]

//   payment string [ref: > Payment.id, unique]

//   subtotal decimal(12,2)
//   shippingFee decimal(12,2)

//   totalAmount decimal(12,2)

//   stripeFee decimal(12,2)
//   platformFee decimal(12,2)

//   organizerAmount decimal(12,2)
//   organizerAmountWithoutShipping decimal(12,2)

//   createdAt date
//   updatedAt date
// }

export interface IPaymentBreakdown {
  payment: Types.ObjectId
  subtotal: number
  shippingFee: number
  totalAmount: number
  stripeFee: number
  platformFee: number
  organizerAmount: number
  organizerAmountWithoutShipping: number
  discountAmount: number // only for lunching campaign:
}

export interface IPaymentDoc extends Document, IPayment {}

export interface IDonationPaymentDoc extends IDonationPayment, Document {}

export interface IOrderPaymentDoc extends IOrderPayment, Document {}
export interface ILaunchPaymentDoc extends ILaunchPayment, Document {}

// export interface IPaymentModel extends Model<IPaymentDoc> {
//   getById(id: string): Promise<IPayment | null>
// }
export interface IPaymentBreakdownDoc extends IPaymentBreakdown, Document {}
