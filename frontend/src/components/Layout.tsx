import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, Users } from 'lucide-react'
import { notificationsApi } from '../api'
import { useAuthStore } from '../store/auth'
import BottomNav from './BottomNav'

function TopBar() {
  const navigate = useNavigate()
  const role = useAuthStore(s => s.user?.role)
  const canManageStaff = ['superadmin', 'owner', 'manager'].includes(role ?? '')
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 60000,
  })
  const unread = data?.unread_count ?? 0

  return (
    <div className="sticky top-0 z-20 bg-[#FAFAFA]/90 backdrop-blur-sm border-b border-gray-100">
      <div className="flex items-center justify-between px-4 h-11">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-xl shadow-sm" style={{ background: '#60CCED' }}>
            <img src="/logo.svg" alt="" className="w-6 h-6 object-contain" />
          </span>
          <span className="text-[17px] font-extrabold text-primary-500 tracking-tight">Sheber Qonaq</span>
        </div>
        <div className="flex items-center gap-1">
          {canManageStaff && (
            <button
              onClick={() => navigate('/staff')}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              aria-label="Сотрудники">
              <Users size={18} className="text-gray-400" />
            </button>
          )}
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-8 h-8 rounded-xl flex items-center justify-center">
            <Bell size={18} className={unread > 0 ? 'text-primary-500' : 'text-gray-400'} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen min-h-dvh max-w-[430px] mx-auto bg-[#FAFAFA] shadow-[0_0_60px_rgba(0,0,0,0.08)] relative">
      <TopBar />
      <main className="flex-1 overflow-y-auto pb-[68px]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
