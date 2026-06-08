import type { LucideIcon } from 'lucide-react'

interface KPICardProps {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  color: string          // e.g. 'primary', 'emerald', 'blue', 'red', 'amber'
  onClick?: () => void
}

const colorMap: Record<string, { icon: string; iconBg: string }> = {
  primary: { icon: 'text-primary-600', iconBg: 'bg-primary-50' },
  emerald: { icon: 'text-emerald-600', iconBg: 'bg-emerald-50' },
  blue:    { icon: 'text-blue-600',    iconBg: 'bg-blue-50' },
  red:     { icon: 'text-red-500',     iconBg: 'bg-red-50' },
  amber:   { icon: 'text-amber-600',   iconBg: 'bg-amber-50' },
}

export default function KPICard({ icon: Icon, label, value, sub, color, onClick }: KPICardProps) {
  const c = colorMap[color] ?? colorMap.primary
  return (
    <div
      onClick={onClick}
      className={`tap-card bg-white rounded-2xl p-4 shadow-card ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center`}>
          <Icon size={18} className={c.icon} />
        </div>
        <span className="text-[13px] text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 leading-tight">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}
