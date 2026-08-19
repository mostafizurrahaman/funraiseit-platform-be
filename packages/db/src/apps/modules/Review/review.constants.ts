export const reviewSearchableFields = [
  'name',
] as const

export const reviewSortableFields = [
  'createdAt',
  'updatedAt',
] as const

// Types (optional but recommended)
export type TReviewSearchableField =
  (typeof reviewSearchableFields)[number]

export type TReviewSortableField =
  (typeof reviewSortableFields)[number]