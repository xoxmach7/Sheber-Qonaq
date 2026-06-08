import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen min-h-dvh max-w-[430px] mx-auto bg-[#FAFAFA] shadow-[0_0_60px_rgba(0,0,0,0.08)] relative">
      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-[68px]">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  )
}
