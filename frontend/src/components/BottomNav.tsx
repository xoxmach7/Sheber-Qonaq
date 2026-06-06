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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 safe-bottom z-20">
      <div className="flex">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 text-xs gap-1 transition-colors ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
