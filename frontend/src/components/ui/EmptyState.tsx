import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
}

export default function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
      <div className="w-[72px] h-[72px] rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon size={32} className="text-gray-400" />
      </div>
      <p className="text-base font-semibold text-gray-500">{title}</p>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}
