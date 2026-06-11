import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '../../api'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  BedDouble, CheckCircle2, ArrowDownCircle, ArrowUpCircle,
  Banknote, AlertCircle, Globe, Plus, LogOut, User, CreditCard,
} from 'lucide-react'
import { KPICard, Avatar } from '../../components/ui'
import { useAuthStore } from '../../store/auth'

function fmt(n: number | string) {
  return Number(n).toLocaleString('ru-KZ', { maximumFractionDigits: 0 }) + ' ₸'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
  })

  const today = format(new Date(), 'd MMMM', { locale: ru })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'
  const userName = user?.first_name || 'Администратор'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const occ = data?.occupancy
  const fin = data?.finances
  const todayData = data?.today
  const alerts = data?.alerts

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Greeting */}
      <div className="flex items-start justify-between pb-1">
        <div>
          <p className="text-sm text-gray-400">{greeting}, {userName}</p>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-0.5">Sheber PMS</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Сегодня, {today}</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors mt-1"
          title="Выйти"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <KPICard
          icon={BedDouble}
          label="Занято мест"
          value={`${occ?.occupied ?? 0}/${occ?.total ?? 0}`}
          sub={`${(occ?.rate ?? 0).toFixed(0)}% загрузка`}
          color="primary"
          onClick={() => navigate('/occupancy')}
        />
        <KPICard
          icon={CheckCircle2}
          label="Свободно"
          value={occ?.available ?? 0}
          sub={`${occ?.maintenance ?? 0} на ремонте`}
          color="emerald"
          onClick={() => navigate('/occupancy')}
        />
        <KPICard
          icon={ArrowDownCircle}
          label="Заезды сегодня"
          value={todayData?.checkins?.length ?? 0}
          color="blue"
          onClick={() => navigate('/stays')}
        />
        <KPICard
          icon={ArrowUpCircle}
          label="Выезды сегодня"
          value={todayData?.checkouts?.length ?? 0}
          color="red"
          onClick={() => navigate('/stays')}
        />
      </div>

      {/* Revenue card */}
      <KPICard
        icon={Banknote}
        label="Доход за месяц"
        value={fmt(fin?.income_this_month ?? 0)}
        sub={Number(fin?.expenses_this_month ?? 0) > 0 ? `Расходы: ${fmt(fin?.expenses_this_month ?? 0)}` : undefined}
        color="emerald"
        onClick={() => navigate('/finances')}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: Plus,       label: 'Заселить',    color: 'bg-emerald-500', to: '/stays' },
          { icon: LogOut,     label: 'Выселить',    color: 'bg-red-500',     to: '/stays' },
          { icon: User,       label: 'Новый гость', color: 'bg-primary-500', to: '/guests' },
          { icon: CreditCard, label: 'Платёж',      color: 'bg-amber-500',   to: '/finances' },
        ].map((a, i) => (
          <button
            key={i}
            onClick={() => navigate(a.to)}
            className="tap-card flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-card text-left"
          >
            <div className={`w-9 h-9 rounded-xl ${a.color}/10 flex items-center justify-center`}>
              <a.icon size={18} className={`${a.color.replace('bg-', 'text-')}`} />
            </div>
            <span className="text-sm font-semibold text-gray-900">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Today Activity */}
      {(todayData?.checkins?.length || todayData?.checkouts?.length) ? (
        <section>
          <h3 className="text-[15px] font-bold text-gray-900 mb-2.5">Сегодня</h3>
          <div className="flex flex-col gap-2">
            {todayData?.checkouts?.map((s, i) => (
              <div key={`out-${i}`} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-card">
                <Avatar name={`${s.guest__first_name} ${s.guest__last_name}`} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {s.guest__first_name} {s.guest__last_name}
                  </p>
                  <p className="text-xs text-gray-400">{s.unit__name}</p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">
                  <ArrowUpCircle size={12} />
                  Выезд
                </div>
              </div>
            ))}
            {todayData?.checkins?.map((s, i) => (
              <div key={`in-${i}`} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-card">
                <Avatar name={`${s.guest__first_name} ${s.guest__last_name}`} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {s.guest__first_name} {s.guest__last_name}
                  </p>
                  <p className="text-xs text-gray-400">{s.unit__name}</p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold">
                  <ArrowDownCircle size={12} />
                  Заезд
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Debtors */}
      {alerts?.debtors && alerts.debtors.length > 0 && (
        <section>
          <h3 className="text-[15px] font-bold text-gray-900 mb-2.5 flex items-center gap-1.5">
            <AlertCircle size={15} className="text-amber-500" />
            Должники
          </h3>
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {alerts.debtors.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={d.guest_name} size={32} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.guest_name}</p>
                    <p className="text-xs text-gray-400">{d.unit_name}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-red-600">-{fmt(d.debt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MPIS alert */}
      {(alerts?.mpis_pending_count ?? 0) > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <Globe size={20} className="text-orange-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">
              {alerts!.mpis_pending_count} иностранц{alerts!.mpis_pending_count === 1 ? 'а' : 'ев'} без регистрации MPIS
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Зарегистрируйте в eQonaq.kz
            </p>
          </div>
        </div>
      )}

      {/* Expiring soon */}
      {(alerts?.expiring_soon_count ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{alerts!.expiring_soon_count}</strong> заездов заканчиваются в течение 3 дней
          </p>
        </div>
      )}
    </div>
  )
}
