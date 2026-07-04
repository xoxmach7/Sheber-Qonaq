import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '../../api'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  BedDouble, CheckCircle2, ArrowDownCircle, ArrowUpCircle,
  Banknote, AlertCircle, Globe, Plus, LogOut, User, CreditCard,
  CalendarClock, ShieldAlert,
} from 'lucide-react'
import { KPICard } from '../../components/ui'
import { useAuthStore } from '../../store/auth'
import { REFETCH_INTERVAL } from '../../lib/constants'
import { plural } from '../../lib/dates'

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
    refetchInterval: REFETCH_INTERVAL.DASHBOARD,
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
  const kpi = data?.kpi

  // ── Сводка «Требует внимания» (для заметной панели сверху) ──
  const checkoutsToday = todayData?.checkouts?.length ?? 0
  const debtors = alerts?.debtors ?? []
  const debtTotal = debtors.reduce((s, d) => s + Number(d.debt), 0)
  const mpisPending = alerts?.mpis_pending_count ?? 0
  const expiringSoon = alerts?.expiring_soon_count ?? 0

  type TopAlert = { key: string; icon: typeof Globe; title: string; sub?: string; cls: string; to?: string; scrollTo?: string }
  // Все алерты единого цвета (amber) — как "заезды скоро заканчиваются".
  const ALERT_CLS = 'bg-amber-50 border-amber-200 text-amber-700'
  const topAlerts: TopAlert[] = []
  if (mpisPending > 0) topAlerts.push({
    key: 'mpis', icon: Globe,
    title: `${mpisPending} ${plural(mpisPending, 'гость', 'гостя', 'гостей')} без МПИС`,
    cls: ALERT_CLS, to: '/stays',
  })
  if (debtors.length > 0) topAlerts.push({
    key: 'debt', icon: Banknote,
    title: `${debtors.length} ${plural(debtors.length, 'должник', 'должника', 'должников')} · ${fmt(debtTotal)}`,
    cls: ALERT_CLS, to: '/stays?debtors=1',
  })
  if (checkoutsToday > 0) topAlerts.push({
    key: 'checkout', icon: ArrowUpCircle,
    title: `${checkoutsToday} ${plural(checkoutsToday, 'выезд', 'выезда', 'выездов')} сегодня`,
    sub: 'Проверьте оплату перед выездом', cls: ALERT_CLS, to: '/stays',
  })
  if (expiringSoon > 0) topAlerts.push({
    key: 'expiring', icon: AlertCircle,
    title: `${expiringSoon} ${plural(expiringSoon, 'заезд', 'заезда', 'заездов')} скоро заканчиваются`,
    sub: 'В течение 3 дней', cls: ALERT_CLS, to: '/stays',
  })

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Greeting */}
      <div className="flex items-start justify-between pb-1">
        <div>
          <p className="text-sm text-gray-400">{greeting}, {userName}</p>
          <p className="text-[13px] text-gray-500 mt-0.5">Сегодня {today}</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors mt-1"
          title="Выйти"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Требует внимания — заметная сводка сверху */}
      {topAlerts.length > 0 && (
        <section className="space-y-2">
          {topAlerts.map(a => (
            <button
              key={a.key}
              onClick={() => a.scrollTo
                ? document.getElementById(a.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                : navigate(a.to!)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left tap-card ${a.cls}`}>
              <a.icon size={20} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">{a.title}</p>
                {a.sub && <p className="text-xs opacity-80 mt-0.5">{a.sub}</p>}
              </div>
              <ArrowUpCircle size={16} className="rotate-45 opacity-40 shrink-0" />
            </button>
          ))}
        </section>
      )}

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
          sub={`${occ?.out_of_order ?? 0} закрытых`}
          color="emerald"
          onClick={() => navigate('/occupancy?filter=free')}
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

      {/* Active bookings + violations */}
      <div className="grid grid-cols-2 gap-2.5">
        <KPICard
          icon={CalendarClock}
          label="Активные брони"
          value={kpi?.active_bookings ?? 0}
          color="violet"
          onClick={() => navigate('/stays?tab=bookings')}
        />
        <KPICard
          icon={ShieldAlert}
          label="Нарушения за месяц"
          value={kpi?.violations_this_month ?? 0}
          color="red"
          onClick={() => navigate('/guests?tab=blacklist')}
        />
      </div>

      {/* Revenue card — доход и расход за месяц */}
      <KPICard
        icon={Banknote}
        label="Доход за месяц"
        value={fmt(fin?.income_this_month ?? 0)}
        sub={`Расходы: ${fmt(fin?.expenses_this_month ?? 0)}`}
        color="emerald"
        onClick={() => navigate('/finances')}
      />

    </div>
  )
}
