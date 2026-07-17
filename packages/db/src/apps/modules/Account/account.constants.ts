export const accountSearchableFields = ['name'] as const

export const accountSortableFields = ['createdAt', 'updatedAt'] as const

export const Countries = {
  AUSTRALIA: 'AU',
  AUSTRIA: 'AT',
  BELGIUM: 'BE',
  BRAZIL: 'BR',
  BULGARIA: 'BG',
  CANADA: 'CA',
  CROATIA: 'HR',
  CYPRUS: 'CY',
  CZECH_REPUBLIC: 'CZ',
  DENMARK: 'DK',
  ESTONIA: 'EE',
  FINLAND: 'FI',
  FRANCE: 'FR',
  GERMANY: 'DE',
  GREECE: 'GR',
  HONG_KONG: 'HK',
  HUNGARY: 'HU',
  INDIA: 'IN',
  IRELAND: 'IE',
  ITALY: 'IT',
  JAPAN: 'JP',
  LATVIA: 'LV',
  LIECHTENSTEIN: 'LI',
  LITHUANIA: 'LT',
  LUXEMBOURG: 'LU',
  MALAYSIA: 'MY',
  MALTA: 'MT',
  MEXICO: 'MX',
  NETHERLANDS: 'NL',
  NEW_ZEALAND: 'NZ',
  NORWAY: 'NO',
  POLAND: 'PL',
  PORTUGAL: 'PT',
  ROMANIA: 'RO',
  SINGAPORE: 'SG',
  SLOVAKIA: 'SK',
  SLOVENIA: 'SI',
  SPAIN: 'ES',
  SWEDEN: 'SE',
  SWITZERLAND: 'CH',
  THAILAND: 'TH',
  UNITED_ARAB_EMIRATES: 'AE',
  UNITED_KINGDOM: 'GB',
  UNITED_STATES: 'US',
} as const

export const CountryValues = Object.values(Countries)

export type TCountry = (typeof Countries)[keyof typeof Countries]

// Types (optional but recommended)
export type TAccountSearchableField = (typeof accountSearchableFields)[number]

export type TAccountSortableField = (typeof accountSortableFields)[number]

export const Currency = {
  USD: 'usd',
} as const

export const CurrencyValues = Object.values(Currency)

export type TCurrency = (typeof Currency)[keyof typeof Currency]

export const DefaultCurrency: TCurrency = Currency.USD

export const accountStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  RESTRICTED: 'restricted',
} as const
export const accountStatusValues = Object.values(accountStatus)

export type TAccountStatus = (typeof accountStatus)[keyof typeof accountStatus]
