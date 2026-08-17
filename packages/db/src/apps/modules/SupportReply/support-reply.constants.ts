export const supportReplySearchableFields = [
  'name',
] as const

export const supportReplySortableFields = [
  'createdAt',
  'updatedAt',
] as const

// Types (optional but recommended)
export type TSupportReplySearchableField =
  (typeof supportReplySearchableFields)[number]

export type TSupportReplySortableField =
  (typeof supportReplySortableFields)[number]