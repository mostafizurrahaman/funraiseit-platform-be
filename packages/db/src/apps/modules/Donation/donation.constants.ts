export const donationSearchableFields = [
  'supporterEmail',
  'supporterPhone',
  'supporterName',
] as const

export const donationSortableFields = [
  'createdAt',
  'paidAt',
  'subTotal',
  'totalAmount',
  'organizerNetAmount',
  'platformFeeAmount',
  'stripeFeeAmount',
  'platformFeeAmount',
] as const

// Types (optional but recommended)
export type TDonationSearchableField = (typeof donationSearchableFields)[number]

export type TDonationSortableField = (typeof donationSortableFields)[number]

export const DonationStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
} as const

export const donationStatusValues = Object.values(DonationStatus)

export type TDonationStatusType = (typeof DonationStatus)[keyof typeof DonationStatus]
