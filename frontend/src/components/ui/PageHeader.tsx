import type { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: string
  actionIcon?: LucideIcon
  onAction?: () => void
  actionVariant?: 'primary' | 'danger'
}

export default function PageHeader({
  title, subtitle, action, actionIcon: ActionIcon, onAction, actionVariant = 'primary',
}: PageHeaderProps) {
  const btnClass = actionVariant === 'danger'
    ? 'bg-red-600 text-white'
    : 'bg-primary-500 text-white'

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold shadow-sm tap-card ${btnClass}`}
        >
          {ActionIcon && <ActionIcon size={16} />}
          {action}
        </button>
      )}
    </div>
  )
}
