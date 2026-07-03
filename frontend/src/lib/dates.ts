import { format, addDays, addMonths } from 'date-fns'
import type { RateType } from '../types'

/**
 * Вычисляет дату выезда на основе даты заезда и типа тарифа.
 * Добавляет 1 период: daily = +1 день, weekly = +7 дней, monthly = +1 месяц
 */
export function addPeriod(dateStr: string, rate: RateType): string {
  if (!dateStr) return dateStr
  const d = new Date(dateStr + 'T12:00:00')
  const nd = rate === 'daily' ? addDays(d, 1) : rate === 'weekly' ? addDays(d, 7) : addMonths(d, 1)
  return format(nd, 'yyyy-MM-dd')
}

/**
 * Русское склонение числительных
 * @example plural(1, 'день', 'дня', 'дней') => 'день'
 * @example plural(2, 'день', 'дня', 'дней') => 'дня'
 * @example plural(5, 'день', 'дня', 'дней') => 'дней'
 */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
