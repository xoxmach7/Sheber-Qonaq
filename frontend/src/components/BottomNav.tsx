import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BedDouble,
  Users,
  CalendarDays,
  Wallet,
} from 'lucide-react'

const tabs = [
  { to: '/dashboard',  label: 'Главная',  Icon: LayoutDashboard },
  { to: '/occupancy',  label: 'Карта',    Icon: BedDouble },
  { to: '/stays',      label: 'Заезды',   Icon: CalendarDays },
  { to: '/guests',     label: 'Гости',    Icon: Users },
  { to: '/finances',   label: 'Финансы',  Icon: Wallet },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-lg border-t border-gray-100 safe-bottom z-20 shadow-nav">
      <div className="flex">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-all touch-manipulation ${
                isActive
                  ? 'text-primary-500'
                  : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
