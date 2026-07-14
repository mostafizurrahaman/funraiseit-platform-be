export const siteInfoSearchableFields = [
  'name',
] as const

export const siteInfoSortableFields = [
  'createdAt',
  'updatedAt',
] as const

// Types (optional but recommended)
export type TSiteInfoSearchableField =
  (typeof siteInfoSearchableFields)[number]

export type TSiteInfoSortableField =
  (typeof siteInfoSortableFields)[number]