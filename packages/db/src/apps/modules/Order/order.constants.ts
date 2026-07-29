export const orderSearchableFields = ['name'] as const

export const orderSortableFields = ['createdAt', 'updatedAt'] as const

// Types (optional but recommended)
export type TOrderSearchableField = (typeof orderSearchableFields)[number]

export type TOrderSortableField = (typeof orderSortableFields)[number]

export const OrderStatus = {
  PENDING: 'pending', // Waiting for payment
  PAID: 'paid', // Payment successful
  PARTIALLY_FULFILLED: 'partially_fulfilled', // Order completed (file generated or package prepared)
  DELIVERED: 'delivered', // Customer received product / digital download available
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const

export const OrderStatusValues = Object.values(OrderStatus)

export type TOrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]
