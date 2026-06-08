import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = 'Поиск...' }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3.5 py-2.5">
      <Search size={18} className="text-gray-400 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-none bg-transparent outline-none text-[15px] text-gray-900 w-full placeholder:text-gray-400"
      />
      {value && (
        <button onClick={() => onChange('')} className="shrink-0">
          <X size={16} className="text-gray-400" />
        </button>
      )}
    </div>
  )
}
