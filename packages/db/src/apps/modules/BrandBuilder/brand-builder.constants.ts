export const brandBuilderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  COMPLETED: 'completed',
  PAYMEMT_FAILED: 'payment_failed',
} as const

export const brandBuilderStatusValues = Object.values(brandBuilderStatus)

export const brandBuilderSearchableFields = [
  'name',
  'sellingItem',
  'businessName',
  'organizerName',
  'phoneNumber',
] as const

export const brandBuilderSortableFields = ['createdAt', 'updatedAt'] as const

// Types (optional but recommended)
export type TBrandBuilderSearchableField = (typeof brandBuilderSearchableFields)[number]

export type TBrandBuilderSortableField = (typeof brandBuilderSortableFields)[number]
export type TBrandBuilderBuilderStatusType =
  (typeof brandBuilderStatus)[keyof typeof brandBuilderStatus]
