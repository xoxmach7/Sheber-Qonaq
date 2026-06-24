import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, addMonths, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { ru } from 'date-fns/locale'
import { staysApi } from '../../api'

const ISO = (d: Date) => format(d, 'yyyy-MM-dd')

// Цвет ячейки по проценту занятости (rate = occupied/total*100)
function heatClass(rate: number, hasData: boolean): string {
  if (!hasData) return 'bg-gray-50 text-gray-300'
  if (rate === 0) return 'bg-emerald-50 text-emerald-700'
  if (rate < 34) return 'bg-emerald-200 text-emerald-900'
  if (rate < 67) return 'bg-amber-200 text-amber-900'
  if (rate < 100) return 'bg-orange-300 text-orange-900'
  return 'bg-rose-400 text-white'
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function MonthHeatmap() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<string | null>(null)

  // Полуоткрытый интервал ночей: [first, firstOfNextMonth)
  const first = startOfMonth(month)
  const last = endOfMonth(month)
  const from = ISO(first)
  const to = ISO(startOfMonth(addMonths(month, 1)))

  const { data, isLoading } = useQuery({
    queryKey: ['occupancy-calendar', from, to],
    queryFn: () => staysApi.occupancyCalendar(from, to),
  })

  const days = data?.days ?? {}
  const totalUnits = data?.total_units ?? 0

  // Сетка месяца, понедельник первый
  const lead = (first.getDay() + 6) % 7
  const cells: Array<{ date: string; day: number } | null> = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) {
    cells.push({ date: ISO(d), day: d.getDate() })
  }

  // Свободные на выбранную ночь [selected, selected+1)
  const selNext = selected ? ISO(addDays(new Date(selected), 1)) : ''
  const { data: avail, isLoading: availLoading } = useQuery({
    queryKey: ['availability', selected, selNext],
    queryFn: () => staysApi.availability(selected as string, selNext),
    enabled: !!selected,
  })

  return (
    <div className="space-y-3">
      {/* Переключатель месяца */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-card px-4 py-3">
        <button onClick={() => { setMonth(m => addMonths(m, -1)); setSelected(null) }}
          className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
          <ChevronLeft size={18} className="text-gray-500" />
        </button>
        <div className="text-center">
          <p className="font-bold text-gray-900 capitalize">{format(month, 'LLLL yyyy', { locale: ru })}</p>
          <p className="text-xs text-gray-400">{totalUnits} мест всего</p>
        </div>
        <button onClick={() => { setMonth(m => addMonths(m, 1)); setSelected(null) }}
          className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
          <ChevronRight size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Тепловая карта */}
      <div className="bg-white rounded-2xl shadow-card p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : totalUnits === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Нет койко-мест для расчёта занятости</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map(w => (
                <div key={w} className="text-center text-[10px] font-semibold text-gray-400">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((c, i) => {
                if (!c) return <div key={i} />
                const info = days[c.date]
                const has = !!info
                const isSel = selected === c.date
                return (
                  <button key={i} onClick={() => setSelected(isSel ? null : c.date)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center transition tap-card ${heatClass(info?.rate ?? 0, has)} ${isSel ? 'ring-2 ring-primary-500' : ''}`}>
                    <span className="text-xs font-bold leading-none">{c.day}</span>
                    {has && <span className="text-[9px] leading-none mt-0.5">{info.occupied}/{info.total}</span>}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" />пусто</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200" />~50%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300" />почти</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-400" />занято</span>
            </div>
          </>
        )}
      </div>

      {/* Свободные на выбранный день */}
      {selected && (
        <div className="bg-white rounded-2xl shadow-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900">
              Свободно на {format(new Date(selected), 'd MMMM', { locale: ru })}
            </p>
            <button onClick={() => setSelected(null)}><X size={18} className="text-gray-400" /></button>
          </div>
          {availLoading || !avail ? (
            <p className="text-sm text-gray-400">Загрузка...</p>
          ) : avail.results.length === 0 ? (
            <p className="text-sm text-gray-400">Нет свободных мест на эту ночь</p>
          ) : (
            <div className="space-y-1.5">
              {avail.results.map(u => (
                <div key={u.unit} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.room_name} · {u.unit_type_display}</p>
                  </div>
                  {u.rates?.daily != null && (
                    <span className="text-xs font-medium text-gray-600 shrink-0">
                      {Number(u.rates.daily).toLocaleString('ru-RU')} ₸/сут
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
