export const paymentSearchableFields = ['name'] as const

export const paymentSortableFields = ['createdAt', 'updatedAt'] as const

// Types (optional but recommended)
export type TPaymentSearchableField = (typeof paymentSearchableFields)[number]

export type TPaymentSortableField = (typeof paymentSortableFields)[number]

export const paymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const

export const paymentStatusValues = Object.values(paymentStatus)

export type TPaymentStatusType = (typeof paymentStatus)[keyof typeof paymentStatus]

export const paymentType = {
  ORDER: 'order',
  DONATION: 'donation',
  LAUNCH_FEE: 'launch_fee',
  PAYOUT: 'payout',
} as const

export const paymentTypeValues = Object.values(paymentType)

export type TPaymentType = (typeof paymentType)[keyof typeof paymentType]
