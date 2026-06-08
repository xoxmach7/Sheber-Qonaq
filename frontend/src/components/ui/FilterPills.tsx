interface Option {
  value: string
  label: string
  count?: number
}

interface FilterPillsProps {
  options: Option[]
  value: string
  onChange: (v: string) => void
}

export default function FilterPills({ options, value, onChange }: FilterPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
      {options.map(o => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`shrink-0 px-3.5 py-2 rounded-full text-[13px] font-semibold transition whitespace-nowrap ${
              active
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {o.label}{o.count != null ? ` (${o.count})` : ''}
          </button>
        )
      })}
    </div>
  )
}
