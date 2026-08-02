export const orderSearchableFields = [
  'name',
  'supporterEmail',
  'customerPhone',
  'customerName',
  'shippingAddress.state',
  'shippingAddress.city',
  'shippingAddress.country',
  'shippingAddress.postalCode',
  'shippingAddress.addressLine1',
  'shippingAddress.addressLine2',
  'shippingAddress.phoneNumber',
] as const

export const orderSortableFields = [
  'createdAt',
  'updatedAt',
  'paidAt',
  'orderStatus',
  'paymentStatus',
  'subTotal',
  'shippingAmount',
  'totalAmount',
  'stripeFeeAmount',
  'platformFeeAmount',
  'organizerNetAmount',
  'organizerAmountWithoutShipping',
] as const

// Types (optional but recommended)
export type TOrderSearchableField = (typeof orderSearchableFields)[number]

export type TOrderSortableField = (typeof orderSortableFields)[number]

export const OrderStatus = {
  PENDING: 'pending', // Waiting for payment
  PAID: 'paid', // Payment successful
  PARTIALLY_FULFILLED: 'partially_fulfilled',
  PAYMENT_FAILED: 'payment_failed',
  // Order completed (file generated or package prepared)
  DELIVERED: 'delivered', // Customer received product / digital download available
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const

export const ShippingType = {
  LOCAL_PICKUP: 'local_pickup',
  LOCAL_DELIVERY: 'local_delivery',
  shipping: 'shipping',
} as const

export const shippingTypesValues = Object.values(ShippingType)

export const OrderStatusValues = Object.values(OrderStatus)

export type TOrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]
export type TShippingType = (typeof ShippingType)[keyof typeof ShippingType]
