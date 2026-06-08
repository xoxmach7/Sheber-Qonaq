import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/30 animate-fade-in"
      />
      <div className="relative bg-white rounded-t-[20px] p-5 max-h-[85vh] overflow-y-auto animate-slide-up shadow-sheet">
        <div className="flex justify-center mb-3">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
