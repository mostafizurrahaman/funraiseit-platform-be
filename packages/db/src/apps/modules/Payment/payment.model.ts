import { Schema, model } from 'mongoose'
import {
  type IPaymentBreakdownDoc,
  type IDonationPaymentDoc,
  type IOrderPaymentDoc,
  type IPaymentDoc,
  type ILaunchPaymentDoc,
  type IPayoutPaymentDoc,
} from './payment.interfaces'
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
    campaign: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
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
      type: String,
    },
    paidAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    checkoutUrl: {
      type: String,
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

const launchFeeSchema = new Schema<ILaunchPaymentDoc>({
  organizer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
})

const payoutPaymentSchema = new Schema<IPayoutPaymentDoc>({
  payoutId: {
    type: Schema.Types.ObjectId,
    ref: 'Payout',
    required: true,
  },
  stripePayoutId: {
    type: String,
    required: true,
  },
})
// Static method
// paymentSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

const PaymentBreakDownSchema = new Schema<IPaymentBreakdownDoc>({
  payment: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
  },
  subtotal: {
    type: Number,
    min: 0,
    default: 0,
  },
  shippingFee: {
    type: Number,
    min: 0,
    default: 0,
  },
  totalAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  stripeFee: {
    type: Number,
    min: 0,
    default: 0,
  },
  platformFee: {
    type: Number,
    min: 0,
    default: 0,
  },
  organizerAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  organizerAmountWithoutShipping: {
    type: Number,
    min: 0,
    default: 0,
  },
  discountAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
})

export const Payment = model<IPaymentDoc>('Payment', paymentSchema)

export const OrderPayment = Payment.discriminator(paymentType.ORDER, orderPaymentSchema)

export const DonationPayment = Payment.discriminator(paymentType.DONATION, donationPaymentSchema)
export const LaunchPayment = Payment.discriminator(paymentType.LAUNCH_FEE, launchFeeSchema)
export const PayoutPayment = Payment.discriminator(paymentType.PAYOUT, payoutPaymentSchema)

export const PaymentBreakDown = model<IPaymentBreakdownDoc>(
  'PaymentBreakdown',
  PaymentBreakDownSchema
)
