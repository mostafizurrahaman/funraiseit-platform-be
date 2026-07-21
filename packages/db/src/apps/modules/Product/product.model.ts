import { Schema, model } from 'mongoose'
import type { IDigitalProduct, IPhysicalProduct, IProductDoc } from './product.interfaces'
import { productType, productTypeValues } from './product.constants'

const productSchema = new Schema<IProductDoc>(
  {
    campaign: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    productImage: {
      type: String,
    },
    productType: {
      type: String,
      enum: productTypeValues,
      required: true,
    },
  },
  {
    discriminatorKey: 'productType',
    timestamps: true,
    versionKey: false,
  }
)

const physicalProductSchema = new Schema<IPhysicalProduct>({
  stock: {
    type: Number,
    default: null,
  },
  sku: {
    type: String,
    default: null,
  },
  weight: {
    type: String,
    default: null,
  },
})

const digitalProductSchema = new Schema<IDigitalProduct>({
  digitalFileUrl: {
    type: String,
    required: true,
  },
  digitalFileName: {
    type: String,
    required: true,
  },
  downloadLimit: {
    type: Number,
    default: 0,
    required: true,
    min: 0,
  },
})

// Static method
// productSchema.statics.getById = async function (id: string) {
//   return this.findById(id)
// }

export const Product = model<IProductDoc>('Product', productSchema)

export const PhysicalProduct = Product.discriminator(productType.PHYSICAL, physicalProductSchema)

export const DigitalProduct = Product.discriminator(productType.PHYSICAL, digitalProductSchema)
