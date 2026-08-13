import { brandBuilderStatus, brandBuilderStatusValues } from './brand-builder.constants'
import { Schema, model } from 'mongoose'
import type { IBrandBuilderDoc } from './brand-builder.interfaces'

const brandBuilderSchema = new Schema<IBrandBuilderDoc>(
  {
    organizer: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    products: {
      type: [String],
      required: true,
    },
    businessName: {
      type: String,
      required: true,
    },
    sellingItem: {
      type: String,
      required: true,
    },
    brandImage: {
      type: String,
      required: true,
    },
    brandLogo: {
      type: String,
      required: true,
    },
    colors: {
      type: [String],
      required: true,
    },
    brandStyles: {
      type: String,
      required: true,
    },
    budget: {
      type: String,
      required: true,
    },
    brandBuilderFee: {
      type: Number,
    },
    paidAmount: {
      type: Number,
    },
    status: {
      type: String,
      enum: brandBuilderStatusValues,
      default: brandBuilderStatus.PENDING,
    },
    paidAt: {
      type: Date,
    },

    failedAt: {
      type: Date,
    },
    failedReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Static method
// brandBuilderSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const BrandBuilder = model<IBrandBuilderDoc>('BrandBuilder', brandBuilderSchema)
