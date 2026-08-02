import moment from 'moment'

export const formatRelativeTime = (date: Date | string): string => {
  const now = moment()
  const time = moment(date)

  const seconds = now.diff(time, 'seconds')
  if (seconds < 5) return 'now'
  if (seconds < 60) return `${seconds} sec ago`

  const minutes = now.diff(time, 'minutes')
  if (minutes < 60) return `${minutes} min ago`

  const hours = now.diff(time, 'hours')
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`

  const days = now.diff(time, 'days')
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`

  const months = now.diff(time, 'months')
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`

  const years = now.diff(time, 'years')
  return `${years} year${years > 1 ? 's' : ''} ago`
}
