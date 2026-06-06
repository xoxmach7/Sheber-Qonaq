import type { UnitStatus, StayStatus, LeadStatus } from '../types'

const unitStatusConfig: Record<UnitStatus, { label: string; className: string }> = {
  available:    { label: 'Свободно',    className: 'bg-green-100 text-green-800' },
  occupied:     { label: 'Занято',      className: 'bg-red-100 text-red-800' },
  reserved:     { label: 'Бронь',       className: 'bg-yellow-100 text-yellow-800' },
  dirty:        { label: 'Уборка',      className: 'bg-orange-100 text-orange-800' },
  maintenance:  { label: 'Ремонт',      className: 'bg-gray-100 text-gray-800' },
  out_of_order: { label: 'Не работает', className: 'bg-gray-200 text-gray-500' },
}

const stayStatusConfig: Record<StayStatus, { label: string; className: string }> = {
  active:      { label: 'Активен',   className: 'bg-green-100 text-green-800' },
  checked_out: { label: 'Выехал',    className: 'bg-gray-100 text-gray-600' },
  cancelled:   { label: 'Отменён',   className: 'bg-red-100 text-red-700' },
  no_show:     { label: 'Не приехал',className: 'bg-orange-100 text-orange-700' },
}

const leadStatusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new:               { label: 'Новый',    className: 'bg-blue-100 text-blue-800' },
  viewing_scheduled: { label: 'Показ',    className: 'bg-indigo-100 text-indigo-800' },
  viewed:            { label: 'Осмотрел', className: 'bg-purple-100 text-purple-800' },
  negotiating:       { label: 'Торг',     className: 'bg-yellow-100 text-yellow-800' },
  won:               { label: 'Заехал',   className: 'bg-green-100 text-green-800' },
  lost:              { label: 'Отказ',    className: 'bg-red-100 text-red-700' },
}

interface Props {
  type: 'unit' | 'stay' | 'lead'
  status: string
}

export default function StatusBadge({ type, status }: Props) {
  const config =
    type === 'unit'
      ? unitStatusConfig[status as UnitStatus]
      : type === 'stay'
      ? stayStatusConfig[status as StayStatus]
      : leadStatusConfig[status as LeadStatus]

  if (!config) return null

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
