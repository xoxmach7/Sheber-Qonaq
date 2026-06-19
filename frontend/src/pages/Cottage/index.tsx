import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, X, Search, UserPlus, User } from 'lucide-react'
import api from '../../api/client'
import { staysApi, guestsApi } from '../../api'
import type { GuestCreate } from '../../types'
import { Avatar } from '../../components/ui'
import { formatPhoneKZ, PHONE_PLACEHOLDER } from '../../lib/phone'

// ── Types ──
type ShiftType = 'day' | 'night' | 'full'
interface ShiftBooking { stay_id: number; guest: string; guest_phone: string }
interface DaySlots { day: ShiftBooking | null; night: ShiftBooking | null; full: ShiftBooking | null }
interface CalendarData { unit_id: number; month: string; days: Record<string, DaySlots> }

type ShiftRates = { day: number; night: number; full: number }

const DEFAULT_RATES: ShiftRates = { day: 35500, night: 35500, full: 49500 }

const SHIFTS: { type: ShiftType; label: string; time: string; color: string; bg: string }[] = [
  { type: 'day',   label: 'Дневная', time: '13:00–19:00', color: 'text-amber-700',   bg: 'bg-amber-500' },
  { type: 'night', label: 'Ночная',  time: '20:00–11:00', color: 'text-indigo-700',  bg: 'bg-indigo-500' },
  { type: 'full',  label: 'Сутки',   time: '13:00–11:00', color: 'text-primary-700', bg: 'bg-primary-500' },
]

function fmt(n: number) { return n.toLocaleString('ru-RU') + ' ₸' }

// ── Booking Sheet ──
function BookingSheet({ date, shift, unitId, rates, onClose }: {
  date: string; shift: ShiftType; unitId: number; rates: ShiftRates; onClose: () => void
}) {
  const qc = useQueryClient()
  const shiftCfg = SHIFTS.find(s => s.type === shift)!
  const price = rates[shift]
  const [guestSearch, setGuestSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<{ id: number; name: string; phone: string } | null>(null)
  const [newGuest, setNewGuest] = useState<GuestCreate>({ first_name: '', last_name: '', phone: '', nationality: '', is_foreigner: false })

  const { data: results } = useQuery({
    queryKey: ['guests-search', guestSearch],
    queryFn: () => guestsApi.list(guestSearch),
    enabled: guestSearch.length >= 2,
  })

  const { mutate: createGuest, isPending: creating } = useMutation({
    mutationFn: (d: GuestCreate) => guestsApi.create(d),
    onSuccess: (g) => {
      setSelectedGuest({ id: g.id, name: g.full_name, phone: g.phone })
      setShowCreate(false)
      qc.invalidateQueries({ queryKey: ['guests-search'] })
    },
  })

  const { mutate: book, isPending, error } = useMutation({
    mutationFn: () => staysApi.create({
      unit: unitId,
      guest: selectedGuest!.id,
      check_in_date: date,
      expected_check_out_date: date,
      rate_type: 'daily',
      rate_amount: String(price),
      deposit_amount: 0,
      shift_type: shift,
    } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cottage-calendar'] })
      onClose()
    },
  })

  const displayDate = format(new Date(date + 'T12:00:00'), 'd MMMM yyyy', { locale: ru })

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full bg-white rounded-t-[20px] shadow-xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-bold text-lg">Забронировать</h3>
            <p className="text-xs text-gray-400">{displayDate} · {shiftCfg.label} {shiftCfg.time}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">
              {(error as any)?.response?.data?.non_field_errors?.[0] ?? 'Ошибка бронирования'}
            </div>
          )}

          {/* Shift summary */}
          <div className={`rounded-2xl px-4 py-3 ${shiftCfg.bg} bg-opacity-10 border border-opacity-20`}
            style={{ backgroundColor: `${shiftCfg.bg.replace('bg-', '')}10` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-bold text-base ${shiftCfg.color}`}>{shiftCfg.label} смена</p>
                <p className="text-xs text-gray-500">{shiftCfg.time}</p>
              </div>
              <p className={`text-xl font-extrabold ${shiftCfg.color}`}>{fmt(price)}</p>
            </div>
          </div>

          {/* Guest */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Гость *</label>
            {selectedGuest ? (
              <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3">
                <Avatar name={selectedGuest.name} size={32} />
                <span className="flex-1 font-medium text-sm text-primary-800">{selectedGuest.name}</span>
                <button onClick={() => setSelectedGuest(null)}><X size={16} className="text-gray-400" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input-field pl-9" placeholder="Имя или телефон..."
                  value={guestSearch}
                  onChange={e => { setGuestSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)} />
                {showDropdown && results?.results && results.results.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {results.results.slice(0, 5).map(g => (
                      <button key={g.id} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0 flex items-center gap-3"
                        onMouseDown={() => { setSelectedGuest({ id: g.id, name: g.full_name, phone: g.phone }); setGuestSearch(''); setShowDropdown(false) }}>
                        <Avatar name={g.full_name} size={28} />
                        <div><p className="text-sm font-medium">{g.full_name}</p><p className="text-xs text-gray-400">{g.phone}</p></div>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && guestSearch.length >= 2 && results?.results?.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-4 py-3 text-sm text-gray-500 border-b">Гость не найден</div>
                    <button onMouseDown={() => { setShowCreate(true); setShowDropdown(false) }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-primary-600 text-sm font-medium">
                      <UserPlus size={15} /> Создать нового гостя
                    </button>
                  </div>
                )}
              </div>
            )}

            {showCreate && !selectedGuest && (
              <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><User size={12} />Новый гость</p>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-field text-sm" placeholder="Имя *" value={newGuest.first_name} onChange={e => setNewGuest(g => ({ ...g, first_name: e.target.value }))} />
                  <input className="input-field text-sm" placeholder="Фамилия *" value={newGuest.last_name} onChange={e => setNewGuest(g => ({ ...g, last_name: e.target.value }))} />
                </div>
                <input className="input-field text-sm" placeholder={PHONE_PLACEHOLDER} value={newGuest.phone} onChange={e => setNewGuest(g => ({ ...g, phone: formatPhoneKZ(e.target.value) }))} />
                <button onClick={() => createGuest(newGuest)}
                  disabled={!newGuest.first_name || !newGuest.last_name || !newGuest.phone || creating}
                  className="w-full py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40">
                  {creating ? 'Создаём...' : 'Создать и выбрать'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={() => book()}
            disabled={!selectedGuest || isPending}
            className="w-full py-3.5 bg-primary-500 text-white rounded-2xl text-sm font-bold disabled:opacity-40">
            {isPending ? 'Бронируем...' : `Забронировать — ${fmt(price)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Day Cell ──
function DayCell({ date, slots, onBook }: {
  date: Date; slots: DaySlots; onBook: (shift: ShiftType) => void
}) {
  const dateStr = format(date, 'd')
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))

  if (slots.full) {
    return (
      <div className="rounded-xl overflow-hidden border border-violet-300">
        <div className={`px-1 py-1.5 text-center ${isToday ? 'bg-primary-500' : 'bg-gray-50 border-b border-gray-100'}`}>
          <span className={`text-xs font-bold ${isToday ? 'text-white' : 'text-gray-700'}`}>{dateStr}</span>
        </div>
        <div className="bg-violet-500 px-1 py-3 text-center">
          <p className="text-[10px] font-bold text-white">СУТКИ</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-100">
      <div className={`px-1 py-1.5 text-center ${isToday ? 'bg-primary-500' : 'bg-gray-50 border-b border-gray-100'}`}>
        <span className={`text-xs font-bold ${isToday ? 'text-white' : 'text-gray-700'}`}>{dateStr}</span>
      </div>
      <div className="divide-y divide-gray-100">
        {/* Day shift */}
        {slots.day ? (
          <div className="bg-orange-400 px-1 py-2 text-center">
            <p className="text-[10px] font-bold text-white">13–19</p>
          </div>
        ) : (
          <button onClick={() => !isPast && onBook('day')}
            disabled={isPast}
            className="w-full bg-white px-1 py-2 text-center hover:bg-orange-50 transition disabled:opacity-30">
            <p className="text-[10px] text-gray-400">13–19</p>
            <p className="text-[9px] text-emerald-500 font-medium">св.</p>
          </button>
        )}
        {/* Night shift */}
        {slots.night ? (
          <div className="bg-blue-600 px-1 py-2 text-center">
            <p className="text-[10px] font-bold text-white">20–11</p>
          </div>
        ) : (
          <button onClick={() => !isPast && onBook('night')}
            disabled={isPast}
            className="w-full bg-white px-1 py-2 text-center hover:bg-blue-50 transition disabled:opacity-30">
            <p className="text-[10px] text-gray-400">20–11</p>
            <p className="text-[9px] text-emerald-500 font-medium">св.</p>
          </button>
        )}
        {/* Full day button — only if both shifts free */}
        {!slots.day && !slots.night && !isPast && (
          <button onClick={() => onBook('full')}
            className="w-full bg-gray-50 px-1 py-1.5 text-center hover:bg-violet-50 transition">
            <p className="text-[9px] text-gray-500 font-medium">сутки</p>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──
export default function CottagePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [booking, setBooking] = useState<{ date: string; shift: ShiftType } | null>(null)

  const monthStr = format(currentMonth, 'yyyy-MM')
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null)

  // Юниты организации (cottage-клиент имеет 1+ домиков)
  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.get<{ results: { id: number; name: string }[] }>('/units/').then((r: { data: any }) => r.data),
    staleTime: 60_000,
  })
  const units: { id: number; name: string }[] = unitsData?.results ?? unitsData ?? []
  // Выбранный домик: пользовательский выбор, иначе первый
  const unitId: number = selectedUnitId ?? units[0]?.id ?? 0
  const unitName: string = units.find(u => u.id === unitId)?.name ?? 'Домик'

  // Тарифы смен берём из настроек объекта (Property.shift_rates), не из хардкода
  const { data: propsData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get<{ results: any[] }>('/properties/').then((r: { data: any }) => r.data),
    staleTime: 60_000,
  })
  const properties: any[] = propsData?.results ?? propsData ?? []
  const cottageProp = properties.find(p => p.booking_mode === 'cottage') ?? properties[0]
  const rates: ShiftRates = { ...DEFAULT_RATES, ...(cottageProp?.shift_rates ?? {}) }

  const { data: calData, isLoading } = useQuery<CalendarData>({
    queryKey: ['cottage-calendar', unitId, monthStr],
    queryFn: () => api.get<CalendarData>(`/stays/cottage-calendar/?unit=${unitId}&month=${monthStr}`).then((r: { data: CalendarData }) => r.data),
    staleTime: 30_000,
    enabled: unitId > 0,
  })

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDayOfWeek = (getDay(startOfMonth(currentMonth)) + 6) % 7 // Mon=0

  const totalDays = days.length
  const occupiedCount = calData ? Object.values(calData.days).filter(d => d.day || d.night || d.full).length : 0

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{unitName}</h1>
          <p className="text-xs text-gray-400">Занято {occupiedCount} из {totalDays} дней</p>
        </div>
      </div>

      {/* Переключатель домиков (если больше одного) */}
      {units.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {units.map(u => (
            <button key={u.id} onClick={() => setSelectedUnitId(u.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                u.id === unitId
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}>
              {u.name}
            </button>
          ))}
        </div>
      )}

      {/* Month nav */}
      <div className="bg-white rounded-2xl shadow-card px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <h2 className="text-sm font-bold text-gray-900 capitalize">
            {format(currentMonth, 'LLLL yyyy', { locale: ru })}
          </h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              const slots = calData?.days[key] ?? { day: null, night: null, full: null }
              return (
                <DayCell key={key} date={day} slots={slots}
                  onBook={(shift) => setBooking({ date: key, shift })} />
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl shadow-card px-4 py-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-400" /><span className="text-xs text-gray-600">Дневная 13–19 · {fmt(rates.day)}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-600" /><span className="text-xs text-gray-600">Ночная 20–11 · {fmt(rates.night)}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-violet-500" /><span className="text-xs text-gray-600">Сутки · {fmt(rates.full)}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white border border-gray-200" /><span className="text-xs text-gray-600">Свободно (нажми для брони)</span></div>
        </div>
      </div>

      {/* Booking sheet */}
      {booking && (
        <BookingSheet
          date={booking.date}
          shift={booking.shift}
          unitId={unitId}
          rates={rates}
          onClose={() => setBooking(null)} />
      )}
    </div>
  )
}
