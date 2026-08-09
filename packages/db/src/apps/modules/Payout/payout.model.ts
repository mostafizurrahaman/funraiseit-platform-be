import { Schema, model } from 'mongoose'
import type { IPayoutDoc } from './payout.interfaces'
import { PayoutStatus, payoutStatusValues } from './payout.constants'

const payoutSchema = new Schema<IPayoutDoc>(
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
    stripePayoutId: {
      type: String,
      required: true,
    },
    stripeAccountId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
    },
    status: {
      type: String,
      enum: payoutStatusValues,
      default: PayoutStatus.PENDING,
    },
    failureCode: {
      type: String,
    },
    failureMessage: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    canceledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const Payout = model<IPayoutDoc>('Payout', payoutSchema)
