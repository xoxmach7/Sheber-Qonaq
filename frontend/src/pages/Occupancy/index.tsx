import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi, staysApi, guestsApi, blacklistApi, paymentsApi } from '../../api'
import type { Unit, UnitStatus, StayCreate, RateType, GuestCreate } from '../../types'
import {
  Wrench, Moon, CheckCircle2, Clock, Ban, Sparkles,
  Phone, CalendarDays, LogOut, Plus, X, Search,
  UserPlus, AlertTriangle, User, CalendarPlus,
} from 'lucide-react'
import { PageHeader, FilterPills, Avatar, SegmentControl } from '../../components/ui'
import MonthHeatmap from './MonthHeatmap'
import { formatPhoneKZ, PHONE_PLACEHOLDER } from '../../lib/phone'
import { format } from 'date-fns'

// ── Status config ──
const STATUS: Record<UnitStatus, { label: string; dot: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  available:    { label: 'Свободно',  dot: 'bg-emerald-400', bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 size={12} className="text-emerald-500" /> },
  occupied:     { label: 'Занято',    dot: 'bg-primary-500', bg: 'bg-primary-50',  text: 'text-primary-700', border: 'border-primary-200', icon: <Moon size={12} className="text-primary-500" /> },
  reserved:     { label: 'Бронь',     dot: 'bg-violet-400',  bg: 'bg-violet-50',   text: 'text-violet-700',  border: 'border-violet-200',  icon: <Clock size={12} className="text-violet-500" /> },
  dirty:        { label: 'Уборка',    dot: 'bg-amber-400',   bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   icon: <Sparkles size={12} className="text-amber-500" /> },
  maintenance:  { label: 'Ремонт',    dot: 'bg-orange-400',  bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200',  icon: <Wrench size={12} className="text-orange-500" /> },
  out_of_order: { label: 'Закрыто',   dot: 'bg-gray-400',    bg: 'bg-gray-100',    text: 'text-gray-500',    border: 'border-gray-200',    icon: <Ban size={12} className="text-gray-400" /> },
}

// На карте только 4 статуса: Свободно / Занято / Бронь / Закрыто.
// Уборку и ремонт показываем как «Закрыто».
const CLOSED: UnitStatus[] = ['dirty', 'maintenance', 'out_of_order']
const dispStatus = (s: UnitStatus): UnitStatus => (CLOSED.includes(s) ? 'out_of_order' : s)

// ── Check-In Sheet (pre-selected unit) ──
function CheckInSheet({ unit, onClose, initialMode = 'checkin' }: { unit: Unit; onClose: () => void; initialMode?: 'checkin' | 'booking' }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    guest: '', guestName: '', guestPhone: '',
    check_in_date: format(new Date(), 'yyyy-MM-dd'),
    expected_check_out_date: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
    rate_type: 'monthly' as RateType,
    rate_amount: '',
    prepay: '',
  })
  const [guestSearch, setGuestSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [newGuest, setNewGuest] = useState<GuestCreate>({ first_name: '', last_name: '', phone: '', nationality: '', is_foreigner: false })
  const [mode, setMode] = useState<'checkin' | 'booking'>(initialMode)

  const { data: guestResults } = useQuery({
    queryKey: ['guests-search', guestSearch],
    queryFn: () => guestsApi.list(guestSearch),
    enabled: guestSearch.length >= 2,
  })
  const { data: blCheck } = useQuery({
    queryKey: ['bl-check', form.guestPhone],
    queryFn: () => blacklistApi.check(form.guestPhone),
    enabled: form.guestPhone.length > 5,
  })
  const { mutate: createGuest, isPending: creatingGuest } = useMutation({
    mutationFn: (d: GuestCreate) => guestsApi.create(d),
    onSuccess: (g) => {
      setForm(f => ({ ...f, guest: String(g.id), guestName: g.full_name, guestPhone: g.phone }))
      setShowQuickCreate(false); setGuestSearch('')
      qc.invalidateQueries({ queryKey: ['guests-search'] })
    },
  })
  const { mutate: checkIn, isPending, error } = useMutation({
    mutationFn: (d: StayCreate) => staysApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })
  const { mutate: book, isPending: booking, error: bookError } = useMutation({
    mutationFn: async (prepay: number) => {
      const stay = await staysApi.create({
        unit: unit.id, guest: Number(form.guest),
        check_in_date: form.check_in_date, expected_check_out_date: form.expected_check_out_date,
        rate_type: form.rate_type, rate_amount: form.rate_amount, deposit_amount: 0,
        status: 'reserved',
      })
      if (prepay > 0) {
        await paymentsApi.create({
          stay: stay.id, amount: prepay,
          payment_date: format(new Date(), 'yyyy-MM-dd'), method: 'kaspi',
        })
        // confirm подтвердит, только если предоплата >= порога; иначе бронь остаётся reserved
        try { await staysApi.confirm(stay.id) } catch { /* недобор предоплаты — остаётся резервом */ }
      }
      return stay
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const isBlacklisted = blCheck?.is_blacklisted ?? false
  const canSubmit = form.guest && form.check_in_date && form.expected_check_out_date && form.rate_amount && !isPending && !booking
  const rateLabels: Record<RateType, string> = { daily: 'Суточно', weekly: 'Понедельно', monthly: 'Помесячно' }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div className="relative w-full bg-white rounded-t-[20px] shadow-sheet animate-slide-up max-h-[94vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-bold text-lg">{mode === 'booking' ? 'Забронировать' : 'Заселить'}</h3>
            <p className="text-xs text-gray-400">{unit.room_name} — {unit.name}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          <SegmentControl
            value={mode}
            onChange={(v) => setMode(v as 'checkin' | 'booking')}
            options={[
              { value: 'checkin', label: 'Заселение' },
              { value: 'booking', label: 'Бронь' },
            ]}
          />

          {(error || bookError) && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{((error || bookError) as any)?.response?.data?.non_field_errors?.[0] ?? 'Ошибка'}</div>}

          {isBlacklisted && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={15} className="text-red-600 shrink-0" />
                <span className="font-bold text-red-700 text-sm">Гость в чёрном списке!</span>
              </div>
              {blCheck?.entries.map(e => (
                <p key={e.id} className="text-xs text-red-600 ml-5">{e.reason_display}: {e.description.slice(0, 80)}</p>
              ))}
            </div>
          )}

          {/* Guest */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Гость *</label>
            {form.guest ? (
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isBlacklisted ? 'bg-red-50 border-red-300' : 'bg-primary-50 border-primary-200'}`}>
                <Avatar name={form.guestName} size={32} />
                <span className={`flex-1 font-medium text-sm ${isBlacklisted ? 'text-red-800' : 'text-primary-800'}`}>{form.guestName}</span>
                <button onClick={() => setForm(f => ({ ...f, guest: '', guestName: '', guestPhone: '' }))}><X size={16} className="text-gray-400" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input-field pl-9" placeholder="Имя или телефон..."
                  value={guestSearch}
                  onChange={e => { setGuestSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)} />
                {showDropdown && guestResults?.results && guestResults.results.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {guestResults.results.slice(0, 5).map(g => (
                      <button key={g.id} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0 flex items-center gap-3"
                        onMouseDown={() => { setForm(f => ({ ...f, guest: String(g.id), guestName: g.full_name, guestPhone: g.phone })); setGuestSearch(''); setShowDropdown(false) }}>
                        <Avatar name={g.full_name} size={28} />
                        <div><p className="text-sm font-medium text-gray-900">{g.full_name}</p><p className="text-xs text-gray-400">{g.phone}</p></div>
                        {g.is_blacklisted && <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">ЧС</span>}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && guestSearch.length >= 2 && guestResults?.results?.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-4 py-3 text-sm text-gray-500 border-b">Гость не найден</div>
                    <button onMouseDown={() => { setShowQuickCreate(true); setShowDropdown(false) }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-primary-600 text-sm font-medium">
                      <UserPlus size={15} /> Создать нового гостя
                    </button>
                  </div>
                )}
              </div>
            )}

            {showQuickCreate && !form.guest && (
              <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><User size={12} />Новый гость</p>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-field text-sm" placeholder="Имя *" value={newGuest.first_name} onChange={e => setNewGuest(g => ({ ...g, first_name: e.target.value }))} />
                  <input className="input-field text-sm" placeholder="Фамилия *" value={newGuest.last_name} onChange={e => setNewGuest(g => ({ ...g, last_name: e.target.value }))} />
                </div>
                <input className="input-field text-sm" placeholder={PHONE_PLACEHOLDER} value={newGuest.phone} onChange={e => setNewGuest(g => ({ ...g, phone: formatPhoneKZ(e.target.value) }))} />
                <button type="button" onClick={() => setNewGuest(g => ({ ...g, is_foreigner: !g.is_foreigner }))}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold ${newGuest.is_foreigner ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                  <span className="flex items-center gap-1.5"><span>&#127757;</span> Иностранный гость</span>
                  <span className={`w-8 h-4 rounded-full relative shrink-0 ${newGuest.is_foreigner ? 'bg-blue-500' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${newGuest.is_foreigner ? 'translate-x-4' : 'translate-x-0.5'}`} /></span>
                </button>
                {newGuest.is_foreigner && (
                  <div className="space-y-2">
                    <input className="input-field text-sm" placeholder="Гражданство (Россия...)" value={newGuest.nationality ?? ''} onChange={e => setNewGuest(g => ({ ...g, nationality: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="input-field text-sm" placeholder="Номер паспорта" value={newGuest.document_number ?? ''} onChange={e => setNewGuest(g => ({ ...g, document_number: e.target.value, document_type: 'passport_foreign' }))} />
                      <select className="input-field text-sm" value={newGuest.sex ?? ''} onChange={e => setNewGuest(g => ({ ...g, sex: e.target.value as 'M' | 'F' | '' }))}>
                        <option value="">Пол</option>
                        <option value="M">Мужской</option>
                        <option value="F">Женский</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-blue-600">Остальное по паспорту дозаполните в карточке гостя.</p>
                  </div>
                )}
                <button onClick={() => createGuest(newGuest)}
                  disabled={!newGuest.first_name || !newGuest.last_name || !newGuest.phone || creatingGuest}
                  className="w-full py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40">
                  {creatingGuest ? 'Создаём...' : 'Создать и выбрать'}
                </button>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Заезд *</label>
              <input type="date" className="input-field text-sm" value={form.check_in_date} onChange={e => setForm(f => ({ ...f, check_in_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Выезд</label>
              <input type="date" className="input-field text-sm" value={form.expected_check_out_date} onChange={e => setForm(f => ({ ...f, expected_check_out_date: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Тариф *</label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {(['monthly', 'weekly', 'daily'] as RateType[]).map(rt => (
                <button key={rt} onClick={() => setForm(f => ({ ...f, rate_type: rt }))}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${form.rate_type === rt ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {rateLabels[rt]}
                </button>
              ))}
            </div>
            <input type="number" className="input-field" placeholder="Сумма ₸" value={form.rate_amount}
              onChange={e => setForm(f => ({ ...f, rate_amount: e.target.value }))} />
          </div>

          {mode === 'booking' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Предоплата ₸</label>
              <input type="number" className="input-field" placeholder="0 — можно без предоплаты" value={form.prepay}
                onChange={e => setForm(f => ({ ...f, prepay: e.target.value }))} />
              <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                Внесёте от 50% суммы — бронь станет «подтверждённой». Иначе останется резервом.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={() => mode === 'booking'
            ? book(Number(form.prepay || 0))
            : checkIn({ unit: unit.id, guest: Number(form.guest), check_in_date: form.check_in_date, expected_check_out_date: form.expected_check_out_date, rate_type: form.rate_type, rate_amount: form.rate_amount, deposit_amount: 0 })}
            disabled={!canSubmit}
            className={`w-full py-3.5 text-white rounded-2xl text-sm font-bold disabled:opacity-40 ${mode === 'booking' ? 'bg-violet-500' : 'bg-primary-500'}`}>
            {(isPending || booking) ? (mode === 'booking' ? 'Бронируем...' : 'Заселяем...') : (mode === 'booking' ? 'Забронировать' : 'Заселить')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Free unit panel ──
function FreePanel({ unit, onCheckIn, onBook, onChangeStatus, onClose }: {
  unit: Unit; onCheckIn: () => void; onBook: () => void; onChangeStatus: () => void; onClose: () => void
}) {
  const fmtD = (d?: string) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}.${m}.${y}`
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" />
      <div className="relative w-full bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-4">{unit.room_name} — {unit.name}</p>
        {unit.has_booking && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 mb-4 flex items-center gap-2">
            <Clock size={14} className="text-violet-500 shrink-0" />
            <p className="text-xs text-violet-700 font-medium">
              Есть бронь: {fmtD(unit.next_check_in)} → {fmtD(unit.next_check_out)}
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCheckIn}
            className="flex items-center justify-center gap-2 py-3.5 bg-primary-500 text-white rounded-2xl text-sm font-bold">
            <Plus size={18} /> Заселить
          </button>
          <button onClick={onBook}
            className="flex items-center justify-center gap-2 py-3.5 bg-violet-500 text-white rounded-2xl text-sm font-bold">
            <Clock size={16} /> Забронировать
          </button>
        </div>
        <button onClick={onChangeStatus}
          className="w-full mt-2 py-3 bg-gray-100 text-gray-600 rounded-2xl text-sm font-semibold">
          Статус места
        </button>
      </div>
    </div>
  )
}

// ── Occupied unit panel ──
function OccupiedPanel({ unit, onClose, onCheckout, onBook }: {
  unit: Unit; onClose: () => void; onCheckout: () => void; onBook: () => void
}) {
  const { data: blCheck } = useQuery({
    queryKey: ['bl-check', unit.current_guest_phone],
    queryFn: () => blacklistApi.check(unit.current_guest_phone!),
    enabled: !!unit.current_guest_phone && unit.current_guest_phone.length > 5,
  })
  const isBlacklisted = blCheck?.is_blacklisted ?? false

  const fmt = (d?: string) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}.${m}.${y}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" />
      <div className="relative w-full bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">{unit.room_name} — {unit.name}</p>

        {isBlacklisted && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-700 font-semibold">Гость в чёрном списке</p>
          </div>
        )}

        <div className="bg-primary-50 rounded-2xl p-4 mb-4">
          <p className="text-base font-bold text-gray-900">{unit.current_guest}</p>
          {unit.current_guest_phone && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Phone size={13} className="text-gray-400" />
              <span className="text-sm text-gray-600">{unit.current_guest_phone}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            <CalendarDays size={13} className="text-gray-400" />
            <span className="text-sm text-gray-600">{fmt(unit.check_in)} → {fmt(unit.check_out)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onBook}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-violet-500 text-white rounded-2xl text-sm font-bold">
            <CalendarPlus size={16} /> Забронировать
          </button>
          <button onClick={onCheckout}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-red-500 text-white rounded-2xl text-sm font-bold">
            <LogOut size={16} /> Выселить
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status Picker ──
function StatusPicker({ unit, onSelect, onClose }: { unit: Unit; onSelect: (s: UnitStatus) => void; onClose: () => void }) {
  const clickable: UnitStatus[] = ['available', 'out_of_order']
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" />
      <div className="relative w-full bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">{unit.room_name} — {unit.name} — изменить статус</p>
        <div className="grid grid-cols-2 gap-2">
          {clickable.map(s => {
            const cfg = STATUS[s]
            const isCurrent = unit.status === s
            return (
              <button key={s} onClick={() => { onSelect(s); onClose() }} disabled={isCurrent}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-sm font-medium transition tap-card ${isCurrent ? `${cfg.bg} ${cfg.border} ${cfg.text} opacity-50` : 'bg-white border-gray-200 text-gray-700'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0`} />
                {cfg.label}
                {isCurrent && <span className="ml-auto text-xs opacity-60">сейчас</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Booking info panel ──
function BookingPanel({ unit, onCancel, onClose }: { unit: Unit; onCancel: () => void; onClose: () => void }) {
  const fmtD = (d?: string) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}.${m}.${y}`
  }
  const statusLabel = unit.next_booking_status === 'confirmed' ? 'Подтверждена (есть предоплата)' : 'Резерв (без предоплаты)'
  const guestName = unit.next_booking_guest ?? 'Гость'
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" />
      <div className="relative w-full bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">{unit.room_name} — {unit.name}</p>

        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={15} className="text-violet-500 shrink-0" />
            <span className="text-sm font-bold text-violet-700">Бронь · {statusLabel}</span>
          </div>
          <p className="text-base font-bold text-gray-900">{guestName}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <CalendarDays size={13} className="text-gray-400" />
            <span className="text-sm text-gray-600">{fmtD(unit.next_check_in)} → {fmtD(unit.next_check_out)}</span>
          </div>
        </div>

        <button onClick={() => { if (confirm(`Удалить бронь ${guestName}?`)) onCancel() }}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500 text-white rounded-2xl text-sm font-bold">
          <X size={16} /> Удалить
        </button>
      </div>
    </div>
  )
}

// ── Bed cell ──
function BedCell({ unit, position, onClick }: { unit: Unit; position: 'lower' | 'upper'; onClick: () => void }) {
  const booked = !!unit.has_booking && unit.status !== 'occupied'
  const cfg = STATUS[booked ? 'reserved' : dispStatus(unit.status)]
  const posLabel = position === 'lower' ? '↓ Нижн.' : '↑ Верхн.'
  const posColor = position === 'lower' ? 'text-gray-400' : 'text-primary-400'
  const shortName = unit.name.includes('-') ? unit.name.split('-')[1] : unit.name
  const guest = unit.status === 'occupied' ? unit.current_guest : (booked ? unit.next_booking_guest : undefined)
  return (
    <button onClick={onClick}
      className={`relative flex flex-col w-full rounded-xl border p-2 text-left transition tap-card ${cfg.bg} ${cfg.border}`}
      style={{ minHeight: 72 }}>
      <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className={`text-[9px] font-semibold ${posColor} leading-none mb-1`}>{posLabel}</span>
      <span className={`text-xs font-bold ${cfg.text} leading-none`}>{shortName}</span>
      <div className="mt-1">{cfg.icon}</div>
      {guest && (
        <p className={`text-[9px] font-medium mt-0.5 leading-tight truncate w-full ${booked ? 'text-violet-600' : 'text-primary-600'}`}>
          {guest.split(' ')[0]}
        </p>
      )}
    </button>
  )
}

interface RoomGroup { roomId: number; roomName: string; units: Unit[] }
function groupByRoom(units: Unit[]): RoomGroup[] {
  const map = new Map<number, RoomGroup>()
  for (const u of units) {
    if (!map.has(u.room)) map.set(u.room, { roomId: u.room, roomName: u.room_name ?? `Комната ${u.room}`, units: [] })
    map.get(u.room)!.units.push(u)
  }
  return Array.from(map.values())
}

function Legend({ units }: { units: Unit[] }) {
  const counts = units.reduce((acc, u) => { acc[u.status] = (acc[u.status] ?? 0) + 1; return acc }, {} as Record<UnitStatus, number>)
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {(['occupied','available','reserved','dirty','maintenance','out_of_order'] as UnitStatus[]).map(s => {
        const n = counts[s] ?? 0
        if (!n) return null
        const cfg = STATUS[s]
        return (
          <div key={s} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
            <span className="text-xs text-gray-500">{cfg.label}</span>
            <span className={`text-xs font-bold ${cfg.text}`}>{n}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──
type PanelState = { type: 'free' | 'occupied' | 'status' | 'checkin' | 'book' | 'booking'; unit: Unit } | null

export default function OccupancyPage() {
  const qc = useQueryClient()
  const [panel, setPanel] = useState<PanelState>(null)
  const initialFilter =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('filter') === 'free'
      ? 'available'
      : 'all'
  const [filter, setFilter] = useState(initialFilter)
  const [view, setView] = useState<'now' | 'month'>('now')
  const [pFrom, setPFrom] = useState('')
  const [pTo, setPTo] = useState('')
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null)

  const { data: avail, isFetching: availLoading } = useQuery({
    queryKey: ['availability-map', period?.from, period?.to],
    queryFn: () => staysApi.availability(period!.from, period!.to),
    enabled: !!period,
  })

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'], queryFn: propertiesApi.allUnits, staleTime: 30_000,
  })

  const { mutate: changeStatus } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: UnitStatus }) => propertiesApi.updateUnitStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  })

  const { mutate: checkout } = useMutation({
    mutationFn: (stayId: number) => staysApi.checkout(stayId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['units'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setPanel(null) },
  })

  const { mutate: cancelBooking } = useMutation({
    mutationFn: (stayId: number) => staysApi.cancel(stayId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['units'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setPanel(null) },
  })

  const handleUnitClick = (unit: Unit) => {
    if (unit.status === 'occupied') setPanel({ type: 'occupied', unit })
    else if (unit.has_booking) setPanel({ type: 'booking', unit })
    else setPanel({ type: 'free', unit })
  }

  const rooms = groupByRoom(units)
  const occupied = units.filter(u => u.status === 'occupied').length
  const available = units.filter(u => u.status === 'available').length
  const total = units.length
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0

  // Сегменты линейного бара: занято / бронь / обслуживание / свободно
  let occBar = 0, bookedBar = 0, servBar = 0, freeBar = 0
  units.forEach(u => {
    if (u.status === 'occupied') occBar++
    else if (u.status === 'reserved' || (u.status === 'available' && u.has_booking)) bookedBar++
    else if (u.status === 'maintenance' || u.status === 'dirty' || u.status === 'out_of_order') servBar++
    else freeBar++
  })
  const seg = (n: number) => (total > 0 ? (n / total) * 100 : 0)

  const isBooked = (u: Unit) => !!u.has_booking && u.status !== 'occupied'
  const counts: Record<string, number> = {
    all: total,
    available: units.filter(u => u.status === 'available' && !u.has_booking).length,
    occupied: units.filter(u => u.status === 'occupied').length,
    booking: units.filter(isBooked).length,
    closed: units.filter(u => CLOSED.includes(u.status)).length,
  }

  const matchFilter = (u: Unit): boolean => {
    if (filter === 'all') return true
    if (filter === 'available') return u.status === 'available' && !u.has_booking
    if (filter === 'occupied') return u.status === 'occupied'
    if (filter === 'booking') return isBooked(u)
    if (filter === 'closed') return CLOSED.includes(u.status)
    return u.status === filter
  }
  const filteredRooms = filter === 'all' ? rooms : rooms.map(r => ({
    ...r, units: r.units.filter(matchFilter),
  })).filter(r => r.units.length > 0)

  // Режим периода: на карте показываем только юниты, свободные на выбранные даты (по availability)
  const freeIds = new Set((avail?.results ?? []).map(r => r.unit))
  const periodRooms = rooms
    .map(r => ({ ...r, units: r.units.filter(u => freeIds.has(u.id)) }))
    .filter(r => r.units.length > 0)
  const displayRooms = period ? periodRooms : filteredRooms

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-4 py-4 space-y-3">
      <PageHeader title="Карта размещения" />

      <div className="bg-white rounded-2xl shadow-card px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-gray-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-700">Свободно на даты</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="input-field text-sm" value={pFrom} onChange={e => setPFrom(e.target.value)} />
          <input type="date" className="input-field text-sm" value={pTo} onChange={e => setPTo(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button disabled={!pFrom || !pTo || pTo <= pFrom}
            onClick={() => setPeriod({ from: pFrom, to: pTo })}
            className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold disabled:opacity-40">
            Показать свободные
          </button>
          {period && (
            <button onClick={() => { setPeriod(null); setPFrom(''); setPTo('') }}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">Сброс</button>
          )}
        </div>
      </div>

      {period && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-emerald-800">Свободно: {period.from} → {period.to}</p>
          {!availLoading && avail && <span className="text-sm font-extrabold text-emerald-700 shrink-0">{avail.count} мест</span>}
        </div>
      )}

      {!period && (
      <>
      <FilterPills value={filter} onChange={setFilter} options={[
        { value: 'all', label: 'Все', count: counts.all },
        { value: 'available', label: 'Свободно', count: counts.available },
        { value: 'occupied', label: 'Занято', count: counts.occupied },
        { value: 'booking', label: 'Бронь', count: counts.booking },
        { value: 'closed', label: 'Закрыто', count: counts.closed },
      ]} />

      </>
      )}

      {period && availLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {displayRooms.map(room => {
        const isDorm = room.units.some(u => u.unit_type === 'bed')
        const roomAvail = room.units.filter(u => u.status === 'available' && !u.has_booking).length
        const bunks: Array<[Unit, Unit | undefined]> = []
        if (isDorm) for (let i = 0; i < room.units.length; i += 2) bunks.push([room.units[i], room.units[i + 1]])

        return (
          <div key={room.roomId} className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-gray-500">{room.roomName.match(/\d+/)?.[0] ?? '?'}</span>
                </div>
                <span className="font-semibold text-sm text-gray-800 truncate">{room.roomName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs shrink-0">
                {roomAvail > 0 && <span className="flex items-center gap-1 text-emerald-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />{roomAvail} свободно</span>}
              </div>
            </div>

            {isDorm ? (
              <div className="p-3 grid grid-cols-3 gap-2">
                {bunks.map(([lower, upper], idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    {upper ? <BedCell unit={upper} position="upper" onClick={() => handleUnitClick(upper)} />
                      : <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50" style={{ minHeight: 72 }} />}
                    <BedCell unit={lower} position="lower" onClick={() => handleUnitClick(lower)} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 grid grid-cols-3 gap-2">
                {room.units.map(unit => {
                  const booked = !!unit.has_booking && unit.status !== 'occupied'
                  const cfg = STATUS[booked ? 'reserved' : dispStatus(unit.status)]
                  const shortName = unit.name.includes('-') ? unit.name.split('-')[1] : unit.name
                  const guest = unit.status === 'occupied' ? unit.current_guest : (booked ? unit.next_booking_guest : undefined)
                  return (
                    <button key={unit.id} onClick={() => handleUnitClick(unit)}
                      className={`relative flex flex-col items-center justify-center rounded-xl border p-2 transition tap-card ${cfg.bg} ${cfg.border}`}
                      style={{ minHeight: 72 }}>
                      <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${cfg.dot}`} />
                      <p className={`text-xs font-bold ${cfg.text}`}>{shortName}</p>
                      <div className="mt-1">{cfg.icon}</div>
                      {guest && (
                        <p className={`text-[9px] font-medium mt-1 text-center leading-tight truncate w-full px-1 ${booked ? 'text-violet-600' : 'text-primary-600'}`}>
                          {guest.split(' ')[0]}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {displayRooms.length === 0 && !(period && availLoading) && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-base font-semibold text-gray-500">{period ? 'Нет свободных мест' : 'Нет мест'}</p>
          <p className="text-sm mt-1">{period ? 'На выбранные даты всё занято' : 'Попробуйте другой фильтр'}</p>
        </div>
      )}

      {/* Panels */}
      {panel?.type === 'free' && (
        <FreePanel unit={panel.unit}
          onCheckIn={() => setPanel({ type: 'checkin', unit: panel.unit })}
          onBook={() => setPanel({ type: 'book', unit: panel.unit })}
          onChangeStatus={() => setPanel({ type: 'status', unit: panel.unit })}
          onClose={() => setPanel(null)} />
      )}
      {panel?.type === 'checkin' && (
        <CheckInSheet unit={panel.unit} onClose={() => setPanel(null)} />
      )}
      {panel?.type === 'book' && (
        <CheckInSheet unit={panel.unit} initialMode="booking" onClose={() => setPanel(null)} />
      )}
      {panel?.type === 'booking' && (
        <BookingPanel unit={panel.unit}
          onCancel={() => { if (panel.unit.next_stay_id) cancelBooking(panel.unit.next_stay_id) }}
          onClose={() => setPanel(null)} />
      )}
      {panel?.type === 'occupied' && (
        <OccupiedPanel unit={panel.unit}
          onClose={() => setPanel(null)}
          onBook={() => setPanel({ type: 'book', unit: panel.unit })}
          onCheckout={() => { if (panel.unit.current_stay_id) checkout(panel.unit.current_stay_id) }} />
      )}
      {panel?.type === 'status' && (
        <StatusPicker unit={panel.unit}
          onSelect={(s) => changeStatus({ id: panel.unit.id, status: s })}
          onClose={() => setPanel(null)} />
      )}
    </div>
  )
}
