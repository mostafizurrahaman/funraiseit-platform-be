import { Schema, model } from 'mongoose'
import type { IDonationPaymentDoc, IOrderPaymentDoc, IPaymentDoc } from './payment.interfaces'
import {
  paymentStatus,
  paymentStatusValues,
  paymentType,
  paymentTypeValues,
} from './payment.constants'
import { Currency, CurrencyValues } from '../Account'

// General payment schema:
const paymentSchema = new Schema<IPaymentDoc>(
  {
    organizer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paymentType: {
      type: String,
      enum: paymentTypeValues,
      required: true,
    },
    status: {
      type: String,
      enum: paymentStatusValues,
      status: paymentStatus.PENDING,
      required: true,
    },
    currency: {
      type: String,
      enum: CurrencyValues,
      default: Currency.USD,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    stripeCheckoutSessionId: {
      type: String,
    },
    stripePaymentIntentId: {
      type: String,
    },
    stripeChargeId: {
      type: String,
    },
    stripeApplicationFeeId: {
      type: String,
    },
    stripeBalanceTransactionId: {
      typ: String,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    discriminatorKey: 'paymentType',
    timestamps: true,
    versionKey: false,
  }
)

// Order Payment  schema:
const orderPaymentSchema = new Schema<IOrderPaymentDoc>({
  supporter: {
    type: Schema.Types.ObjectId,
    ref: 'Supporter',
    required: true,
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
})

// Donation Payment  schema:
const donationPaymentSchema = new Schema<IDonationPaymentDoc>({
  supporter: {
    type: Schema.Types.ObjectId,
    ref: 'Supporter',
    required: true,
  },
  donation: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
})
// Static method
// paymentSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Payment = model<IPaymentDoc>('Payment', paymentSchema)

export const OrderPayment = Payment.discriminator(paymentType.ORDER, orderPaymentSchema)

export const DonationPayment = Payment.discriminator(paymentType.DONATION, donationPaymentSchema)
