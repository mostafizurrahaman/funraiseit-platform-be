export const contentType = {
  AUP: 'acceptable_use_policy',
  REFUND: 'refund_policy',
  SELLER: 'seller_agreement',
  DISCLAIMER: 'website_disclaimer',
  COOKIE: 'cookie_policy',
  PRIVACY: 'privacy_policy',
  BUYER_TERMS: 'buyer_terms_and_condition',
  DISPUTE: 'charge_back_and_dispute_resolution_policy',
  TERMS: 'terms_and_conditions',
} as const

export const contentTypeValues = Object.values(contentType)

export const contentSearchableFields = ['name'] as const

export const contentSortableFields = ['createdAt', 'updatedAt'] as const

// Types (optional but recommended)
export type TContentSearchableField = (typeof contentSearchableFields)[number]

export type TContentSortableField = (typeof contentSortableFields)[number]

export type TContentType = (typeof contentType)[keyof typeof contentType]
