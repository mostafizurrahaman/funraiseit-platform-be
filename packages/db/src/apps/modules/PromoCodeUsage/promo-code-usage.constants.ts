export const promoCodeUsageSearchableFields = [
  'name',
] as const

export const promoCodeUsageSortableFields = [
  'createdAt',
  'updatedAt',
] as const

// Types (optional but recommended)
export type TPromoCodeUsageSearchableField =
  (typeof promoCodeUsageSearchableFields)[number]

export type TPromoCodeUsageSortableField =
  (typeof promoCodeUsageSortableFields)[number]