import moment, { type Moment } from 'moment'

export interface RawPaymentSummary {
  _id: string | null
  transactionFees: number
  brandBuilderTotal: number
  brandBuilderTotalExcludingStripeFee: number
  brandBuilderStripeFee: number
  launchFeeCollectedTotal: number
  launchFeeCollectedExcludingAllFees: number
  failedOrderPayments: number
  failedDonationPayments: number
  failedBrandBuilderPayments: number
  failedCampaignLaunchPayments: number
  totalFailedPayments: number
  totalPlatformRevenue: number
  brandBuilderRevenue: number
  campaignLaunchRevenue: number
  transactionFeeRevenue: number
  brandBuilderRevenuePercentage: number
  campaignLaunchRevenuePercentage: number
  transactionFeeRevenuePercentage: number
}

export interface RevenueGraphItem {
  date: string
  revenue: number
  platformFees: number
  brandBuilderRevenue: number
  launchFeeRevenue: number
}

const roundToTwo = (val: number = 0): number => Math.round((val + Number.EPSILON) * 100) / 100

/**
 * Normalizes revenue graph data across a given date range using Moment.js.
 * Fills in missing days with zeros and rounds values to 2 decimal places.
 *
 * @param data Array of records returned from MongoDB aggregation
 * @param startDate Start date (Date, string, or Moment instance)
 * @param endDate End date (Date, string, or Moment instance)
 */
export const formatRevenueGraph = (
  data: Partial<RevenueGraphItem>[] = [],
  startDate: string | Date | Moment,
  endDate: string | Date | Moment
): RevenueGraphItem[] => {
  // Map existing records by date string
  const dataMap = new Map<string, Partial<RevenueGraphItem>>()
  for (const item of data) {
    if (typeof item.date === 'string' && item.date.length > 0) {
      dataMap.set(item.date, item)
    }
  }

  const result: RevenueGraphItem[] = []
  const current = moment(startDate).startOf('day')
  const stop = moment(endDate).startOf('day')

  // Loop day-by-day across the full date range
  while (current.isSameOrBefore(stop, 'day')) {
    const dateKey: string = current.format('YYYY-MM-DD')
    const existing = dataMap.get(dateKey)

    result.push({
      date: dateKey,
      revenue: roundToTwo(existing?.revenue ?? 0),
      platformFees: roundToTwo(existing?.platformFees ?? 0),
      brandBuilderRevenue: roundToTwo(existing?.brandBuilderRevenue ?? 0),
      launchFeeRevenue: roundToTwo(existing?.launchFeeRevenue ?? 0),
    })

    current.add(1, 'day')
  }

  return result
}

export const toFixedNum = (val: number, decimals: number = 2): number => {
  return Number(Math.round(Number(`${val}e${decimals}`)) + `e-${decimals}`)
}

export function formatPaymentSummary(raw: RawPaymentSummary) {
  return {
    // Revenue & Earnings
    totalPlatformRevenue: toFixedNum(raw?.totalPlatformRevenue),
    brandBuilderRevenue: toFixedNum(raw?.brandBuilderRevenue),
    campaignLaunchRevenue: toFixedNum(raw?.campaignLaunchRevenue),
    transactionFeeRevenue: toFixedNum(raw?.transactionFeeRevenue),

    // Percentage Breakdown
    brandBuilderRevenuePercentage: toFixedNum(raw?.brandBuilderRevenuePercentage),
    campaignLaunchRevenuePercentage: toFixedNum(raw?.campaignLaunchRevenuePercentage),
    transactionFeeRevenuePercentage: toFixedNum(raw?.transactionFeeRevenuePercentage),

    // Fees & Totals Breakdown
    brandBuilderTotal: toFixedNum(raw?.brandBuilderTotal),
    brandBuilderStripeFee: toFixedNum(raw?.brandBuilderStripeFee),
    brandBuilderTotalExcludingStripeFee: toFixedNum(raw?.brandBuilderTotalExcludingStripeFee),
    launchFeeCollectedTotal: toFixedNum(raw?.launchFeeCollectedTotal),
    launchFeeCollectedExcludingAllFees: toFixedNum(raw?.launchFeeCollectedExcludingAllFees),
    transactionFees: toFixedNum(raw?.transactionFees),

    // Failure Counts (Integers)
    failedOrderPayments: Math.round(raw?.failedOrderPayments || 0),
    failedDonationPayments: Math.round(raw?.failedDonationPayments || 0),
    failedBrandBuilderPayments: Math.round(raw?.failedBrandBuilderPayments || 0),
    failedCampaignLaunchPayments: Math.round(raw?.failedCampaignLaunchPayments || 0),
    totalFailedPayments: Math.round(raw?.totalFailedPayments || 0),
  }
}
