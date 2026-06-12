import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { notificationsApi } from '../api'
import BottomNav from './BottomNav'

function NotificationBell() {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 60000,
  })
  const unread = data?.unread_count ?? 0

  return (
    <button
      onClick={() => navigate('/notifications')}
      className="relative w-9 h-9 rounded-xl bg-white shadow-card flex items-center justify-center">
      <Bell size={18} className="text-gray-600" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen min-h-dvh max-w-[430px] mx-auto bg-[#FAFAFA] shadow-[0_0_60px_rgba(0,0,0,0.08)] relative">
      {/* Floating bell - top right */}
      <div className="fixed top-4 right-4 z-30 max-w-[430px]" style={{ right: 'max(1rem, calc(50vw - 215px + 1rem))' }}>
        <NotificationBell />
      </div>

      <main className="flex-1 overflow-y-auto pb-[68px]">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
