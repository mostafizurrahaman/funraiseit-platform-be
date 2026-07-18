export const paymentSearchableFields = [
  'name',
] as const

export const paymentSortableFields = [
  'createdAt',
  'updatedAt',
] as const

// Types (optional but recommended)
export type TPaymentSearchableField =
  (typeof paymentSearchableFields)[number]

export type TPaymentSortableField =
  (typeof paymentSortableFields)[number]