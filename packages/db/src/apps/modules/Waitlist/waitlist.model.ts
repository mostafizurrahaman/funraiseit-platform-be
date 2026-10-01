import { Schema, model } from 'mongoose'
import type { IWaitlistDoc, IWaitlistModel } from './waitlist.interfaces'
import { waitlistStatus, waitlistStatusValues } from './waitlist.constants'

const waitlistSchema = new Schema<IWaitlistDoc, IWaitlistModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: waitlistStatusValues,
      default: waitlistStatus.REGISTERED,
      index: true,
    },
    memberNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    formattedMemberNumber: {
      type: String,
      required: true,
      index: true,
    },
    isVip: {
      type: Boolean,
      default: false,
      index: true,
    },
    vipClaimedAt: {
      type: Date,
      default: null,
    },
    vipSkippedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

waitlistSchema.statics.getNextMemberNumber = async function () {
  const lastEntry = await this.findOne({}, { memberNumber: 1 })
    .sort({ memberNumber: -1 })
    .lean()

  const memberNumber = lastEntry && typeof lastEntry.memberNumber === 'number' ? lastEntry.memberNumber + 1 : 1
  const formattedMemberNumber = `#${memberNumber.toLocaleString()}`

  return { memberNumber, formattedMemberNumber }
}

export const Waitlist = model<IWaitlistDoc, IWaitlistModel>('Waitlist', waitlistSchema)
