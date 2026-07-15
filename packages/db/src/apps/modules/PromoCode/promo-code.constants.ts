export const promoCodeSearchableFields = ['name'] as const

export const promoCodeSortableFields = [
  'createdAt',
  'updatedAt',
  'expiresAt',
  'code',
  'discountType',
  'discountValue',
] as const

export const discountType = {
  FIXED: 'FIXED',
  PERCENTAGE: 'PERCENTAGE',
} as const

export const discountTypeValues = Object.values(discountType)

// Types (optional but recommended)
export type TPromoCodeSearchableField = (typeof promoCodeSearchableFields)[number]

export type TPromoCodeSortableField = (typeof promoCodeSortableFields)[number]

export type TDiscountType = (typeof discountType)[keyof typeof discountType]
