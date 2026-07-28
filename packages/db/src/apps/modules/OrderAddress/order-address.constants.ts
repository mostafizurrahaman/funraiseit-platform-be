export const orderAddressSearchableFields = [
  'name',
] as const

export const orderAddressSortableFields = [
  'createdAt',
  'updatedAt',
] as const

// Types (optional but recommended)
export type TOrderAddressSearchableField =
  (typeof orderAddressSearchableFields)[number]

export type TOrderAddressSortableField =
  (typeof orderAddressSortableFields)[number]