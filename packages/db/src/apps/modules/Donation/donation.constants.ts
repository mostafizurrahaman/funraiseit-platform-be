export const donationSearchableFields = ['name'] as const

export const donationSortableFields = ['createdAt', 'updatedAt'] as const

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
