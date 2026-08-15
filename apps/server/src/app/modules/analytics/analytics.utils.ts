import moment, { Moment } from 'moment'

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
