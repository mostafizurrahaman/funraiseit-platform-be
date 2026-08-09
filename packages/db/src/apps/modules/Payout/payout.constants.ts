export const PayoutStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const

export const payoutSearchableFields = ['name'] as const

export const payoutSortableFields = ['createdAt', 'updatedAt'] as const

export const payoutStatusValues = Object.values(PayoutStatus)

// Types (optional but recommended)
export type TPayoutSearchableField = (typeof payoutSearchableFields)[number]

export type TPayoutSortableField = (typeof payoutSortableFields)[number]
