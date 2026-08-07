export const payoutSearchableFields = [
  'name',
] as const

export const payoutSortableFields = [
  'createdAt',
  'updatedAt',
] as const

// Types (optional but recommended)
export type TPayoutSearchableField =
  (typeof payoutSearchableFields)[number]

export type TPayoutSortableField =
  (typeof payoutSortableFields)[number]