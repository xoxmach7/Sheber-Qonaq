import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white shadow-xl">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-primary-700 text-white px-4 py-3 flex items-center justify-between shadow">
        <span className="font-bold text-lg tracking-tight">Sheber PMS</span>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  )
}
