export const productSearchableFields = ['name'] as const

export const productSortableFields = ['createdAt', 'updatedAt'] as const

// Types (optional but recommended)
export type TProductSearchableField = (typeof productSearchableFields)[number]

export type TProductSortableField = (typeof productSortableFields)[number]

export const productType = {
  PHYSICAL: 'physical',
  DIGITAL: 'digital',
} as const

export const productTypeValues = Object.values(productType)

export type TProductType = (typeof productType)[keyof typeof productType]
