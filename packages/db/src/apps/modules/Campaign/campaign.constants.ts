export const campaignSearchableFields = [
  'name',
  'fundUsage',
  'campaignCategory',
  'campaignCode',
  'story',
  'organizerName',
  'organizerEmail',
] as const

export const campaignSortableFields = ['createdAt', 'updatedAt'] as const

// Types (optional but recommended)
export type TCampaignSearchableField = (typeof campaignSearchableFields)[number]

export type TCampaignSortableField = (typeof campaignSortableFields)[number]

export const CampaignCategory = {
  BUSINESS: 'business',
  SCHOOL_FUNDRAISER: 'school_fundraiser',
  CHURCH_CAMPAIGN: 'church_campaign',
  SPORTS_TEAM: 'sports_team',
  PRODUCTS_PRE_ORDERS: 'products_pre_orders',
  EVENTS_TICKETS: 'events_tickets',
  DIGITAL_PRODUCTS: 'digital_products',
  COMMUNITY_NONPROFIT: 'community_nonprofit',
} as const

export const campaignCategoryValues = Object.values(CampaignCategory)

export type TCampaignCategory = (typeof CampaignCategory)[keyof typeof CampaignCategory]

export const CampaignStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAYOUT_REQUEST: 'payout_request',
  PAID_OUT: 'paid_out',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const

export const CampaignStatusOrder = {
  [CampaignStatus.DRAFT]: 1,
  [CampaignStatus.PENDING]: 2,
  [CampaignStatus.ACTIVE]: 3,
  [CampaignStatus.COMPLETED]: 4,
  [CampaignStatus.PAYOUT_REQUEST]: 5,
  [CampaignStatus.PAID_OUT]: 6,
  [CampaignStatus.REJECTED]: 7,
  [CampaignStatus.CANCELLED]: 8,
} as const

export const campaignStatusValues = Object.values(CampaignStatus)

export type TCampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus]

export const campaignLunchPaymentStatus = {
  NOT_INITIATED: 'not_initiated',
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
} as const

export const campaignPaymentStatusValues = Object.values(campaignLunchPaymentStatus)
export type TCampaignLunchPaymentStatusType =
  (typeof campaignLunchPaymentStatus)[keyof typeof campaignLunchPaymentStatus]
