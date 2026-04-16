import { subDays, subHours } from 'date-fns'

export type DateRangeId = '24h' | '7d' | '30d'

export const DATE_RANGE_OPTIONS: { id: DateRangeId; label: string }[] = [
  { id: '24h', label: 'Last 24 hours (day)' },
  { id: '7d', label: 'Last 7 days (week)' },
  { id: '30d', label: 'Last 30 days (month)' }
]

export function rangeStart(id: DateRangeId, now = new Date()): Date {
  if (id === '24h') return subHours(now, 24)
  if (id === '7d') return subDays(now, 7)
  return subDays(now, 30)
}
