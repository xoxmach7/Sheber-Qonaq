import { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  show: boolean
  onHide: () => void
}

export default function Toast({ message, type = 'success', show, onHide }: ToastProps) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onHide, 2500)
      return () => clearTimeout(t)
    }
  }, [show, onHide])

  if (!show) return null

  const bgMap = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-primary-500',
  }

  return (
    <div className={`fixed top-14 left-1/2 -translate-x-1/2 ${bgMap[type]} text-white px-5 py-3 rounded-xl text-sm font-semibold z-[200] shadow-lg animate-fade-in max-w-[calc(100%-40px)]`}>
      {message}
    </div>
  )
}
