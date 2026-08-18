import { Schema, model } from 'mongoose'
import type { ICampaignDoc } from './campaign.interfaces'
import {
  campaignCategoryValues,
  campaignLunchPaymentStatus,
  campaignPaymentStatusValues,
  CampaignStatus,
  campaignStatusValues,
} from './campaign.constants'
import { CurrencyValues, DefaultCurrency } from '../Account'

const campaignSchema = new Schema<ICampaignDoc>(
  {
    organizer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    campaignCode: {
      type: String,
      required: true,
      unique: true,
    },
    campaignCategory: {
      type: String,
      enum: campaignCategoryValues,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    story: {
      type: String,
      required: true,
    },
    fundUsage: {
      type: [String],
      required: true,
      min: 1,
    },

    // Amounts :
    currency: {
      type: String,
      enum: CurrencyValues,
      default: DefaultCurrency,
    },
    goalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    raisedAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    raisedAmountWithShipping: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    shippingFee: {
      type: Number,
    },
    launchFee: {
      type: Number,
      required: true,
      min: 0,
    },
    finalLaunchFee: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    promoCode: {
      type: Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    allowLocalPickup: {
      type: Boolean,
      default: false,
    },
    allowLocalDelivery: {
      type: Boolean,
      default: false,
    },
    allowShipping: {
      type: Boolean,
      default: false,
    },
    allowDonation: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    publishedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    expectedPayoutDate: {
      type: Date,
    },
    paidOutAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: campaignStatusValues,
      default: CampaignStatus.DRAFT,
    },
    paymentStatus: {
      type: String,
      enum: campaignPaymentStatusValues,
      default: campaignLunchPaymentStatus.NOT_INITIATED,
    },
    cancelledReason: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// campaignSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Campaign = model<ICampaignDoc>('Campaign', campaignSchema)
