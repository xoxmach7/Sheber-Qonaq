import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../../api'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  TrendingUp, TrendingDown, AlertCircle, CalendarCheck,
  LogIn, LogOut, Users, Wallet, Globe
} from 'lucide-react'

function fmt(n: number | string) {
  return Number(n).toLocaleString('ru-KZ', { maximumFractionDigits: 0 }) + ' ₸'
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
  })

  const today = format(new Date(), 'd MMMM yyyy', { locale: ru })

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
    <div className="px-4 py-4 space-y-5">
      {/* Date */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">Сегодня</h2>
        <p className="text-sm text-gray-500 capitalize">{today}</p>
      </div>

      {/* Occupancy */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Заполняемость
        </h3>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-end mb-2">
            <span className="text-3xl font-bold text-gray-900">
              {((occ?.rate ?? 0)).toFixed(0)}%
            </span>
            <span className="text-sm text-gray-500">
              {occ?.occupied ?? 0} / {occ?.total ?? 0} мест
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${occ?.rate ?? 0}%` }}
            />
          </div>
          <div className="flex gap-3 mt-3 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Свободно: {occ?.available ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              Бронь: {occ?.reserved ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              Уборка: {occ?.dirty ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-600 inline-block" />
              Занято: {occ?.occupied ?? 0}
            </span>
          </div>
        </div>
      </section>

      {/* Finance */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Финансы (месяц)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Доход */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Доход</p>
              <p className="text-base font-bold text-gray-900 leading-tight truncate">
                {fmt(fin?.income_this_month ?? 0)}
              </p>
            </div>
          </div>
          {/* Расходы */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-400 flex items-center justify-center shrink-0">
              <TrendingDown size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Расходы</p>
              <p className="text-base font-bold text-gray-900 leading-tight truncate">
                {fmt(fin?.expenses_this_month ?? 0)}
              </p>
            </div>
          </div>
          {/* Прибыль */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shrink-0">
              <Wallet size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Прибыль</p>
              <p className={`text-base font-bold leading-tight truncate ${
                Number(fin?.net_profit ?? 0) >= 0 ? 'text-gray-900' : 'text-orange-600'
              }`}>
                {fmt(fin?.net_profit ?? 0)}
              </p>
            </div>
          </div>
          {/* Долги */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-400 flex items-center justify-center shrink-0">
              <AlertCircle size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Долги</p>
              <p className="text-base font-bold text-gray-900 leading-tight truncate">
                {fmt(fin?.total_active_debt ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Today events */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          На сегодня
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
            <LogIn size={18} className="mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold text-green-700">
              {todayData?.checkins?.length ?? 0}
            </p>
            <p className="text-xs text-green-600">Заездов</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
            <LogOut size={18} className="mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold text-red-600">
              {todayData?.checkouts?.length ?? 0}
            </p>
            <p className="text-xs text-red-500">Выездов</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
            <CalendarCheck size={18} className="mx-auto text-indigo-500 mb-1" />
            <p className="text-2xl font-bold text-indigo-600">
              {todayData?.viewings?.length ?? 0}
            </p>
            <p className="text-xs text-indigo-500">Показов</p>
          </div>
        </div>
      </section>

      {/* Debtors */}
      {alerts?.debtors && alerts.debtors.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <AlertCircle size={14} className="text-orange-400" />
            Должники
          </h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {alerts.debtors.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users size={14} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">{d.guest_name}</p>
                    <p className="text-xs text-gray-400">{d.unit_name}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-red-600">
                  -{fmt(d.debt)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MPIS alert */}
      {(alerts?.mpis_pending_count ?? 0) > 0 && (
        <div className="bg-orange-50 border border-orange-300 rounded-2xl px-4 py-3 flex items-center gap-3">
          <Globe size={20} className="text-orange-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">
              {alerts!.mpis_pending_count} иностранц{alerts!.mpis_pending_count === 1 ? 'а' : 'ев'} без регистрации MPIS
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Зарегистрируйте в eQonaq.kz — обязательно с 1 июля 2026
            </p>
          </div>
        </div>
      )}

      {/* Expiring soon */}
      {(alerts?.expiring_soon_count ?? 0) > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertCircle size={20} className="text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>{alerts!.expiring_soon_count}</strong> заездов заканчиваются в течение 3 дней
          </p>
        </div>
      )}
    </div>
  )
}
