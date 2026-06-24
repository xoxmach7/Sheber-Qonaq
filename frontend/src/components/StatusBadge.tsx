import type { UnitStatus, StayStatus, LeadStatus } from '../types'

const unitStatusConfig: Record<UnitStatus, { label: string; className: string }> = {
  available:    { label: 'Свободно',    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  occupied:     { label: 'Занято',      className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  reserved:     { label: 'Бронь',       className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  dirty:        { label: 'Уборка',      className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  maintenance:  { label: 'Ремонт',      className: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  out_of_order: { label: 'Не работает', className: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
}

const stayStatusConfig: Record<StayStatus, { label: string; className: string }> = {
  reserved:    { label: 'Бронь',      className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  confirmed:   { label: 'Подтв.',     className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  active:      { label: 'Активен',   className: 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' },
  checked_out: { label: 'Выехал',    className: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  cancelled:   { label: 'Отменён',   className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  no_show:     { label: 'Не приехал',className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  expired:     { label: 'Истёк',      className: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
}

const leadStatusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new:               { label: 'Новый',    className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  viewing_scheduled: { label: 'Показ',    className: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  viewed:            { label: 'Осмотрел', className: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  negotiating:       { label: 'Торг',     className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  won:               { label: 'Заехал',   className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  lost:              { label: 'Отказ',    className: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
}

interface Props {
  type: 'unit' | 'stay' | 'lead'
  status: string
  size?: 'sm' | 'xs'
}

export default function StatusBadge({ type, status, size = 'sm' }: Props) {
  const config =
    type === 'unit'
      ? unitStatusConfig[status as UnitStatus]
      : type === 'stay'
      ? stayStatusConfig[status as StayStatus]
      : leadStatusConfig[status as LeadStatus]

  if (!config) return null

  const sizeClass = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center rounded-lg font-semibold ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  )
}
