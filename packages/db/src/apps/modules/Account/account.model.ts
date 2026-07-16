import { Schema, Types, model } from 'mongoose'
import type { IAccountDoc } from './account.interfaces'
import { Countries, CountryValues, Currency, CurrencyValues } from './account.constants'

const accountSchema = new Schema<IAccountDoc>(
  {
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    account: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: false,
    },
    country: {
      type: String,
      enum: CountryValues,
      default: Countries.UNITED_STATES,
    },
    currency: {
      type: String,
      enum: CurrencyValues,
      default: Currency.USD,
    },
    chargesEnabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    payoutsEnabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    detailsSubmitted: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// accountSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Account = model<IAccountDoc>('Account', accountSchema)
