interface Option {
  value: string
  label: string
}

interface SegmentControlProps {
  options: Option[]
  value: string
  onChange: (v: string) => void
}

export default function SegmentControl({ options, value, onChange }: SegmentControlProps) {
  return (
    <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
      {options.map(o => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${
              active
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-600'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
