export const orderItemSearchableFields = ['name'] as const

export const orderItemSortableFields = ['createdAt', 'updatedAt'] as const

// Types (optional but recommended)
export type TOrderItemSearchableField = (typeof orderItemSearchableFields)[number]

export type TOrderItemSortableField = (typeof orderItemSortableFields)[number]

export const OrderItemStatus = {
  PENDING: 'pending',
  FULFILLED: 'fulfilled',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
}

export const orderItemStatusValues = Object.values(OrderItemStatus)

export type TOrderItemStatusType = (typeof OrderItemStatus)[keyof typeof OrderItemStatus]
