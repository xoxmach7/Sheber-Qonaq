import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staysApi, guestsApi, propertiesApi, blacklistApi, paymentsApi } from '../../api'
import { format, differenceInDays, differenceInMonths, addMonths, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Plus, X, LogOut, User, Search, AlertTriangle, UserPlus,
  ChevronLeft, CreditCard, CalendarClock, Globe, Clock,
} from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import { Avatar, PageHeader, SegmentControl } from '../../components/ui'
import { MpisBadge, MpisPanel, ExtendForm, PaymentForm, TransferForm } from './_helpers'
import { formatPhoneKZ, PHONE_PLACEHOLDER } from '../../lib/phone'
import type { StayCreate, Stay, RateType, GuestCreate } from '../../types'

const fmtTg = (n: number | string) => Number(n).toLocaleString('ru-KZ', { maximumFractionDigits: 0 }) + ' ₸'

// Дата выезда = заезд + 1 период выбранного типа оплаты
function addPeriod(dateStr: string, rate: RateType): string {
  if (!dateStr) return dateStr
  const d = new Date(dateStr + 'T12:00:00')
  const nd = rate === 'daily' ? addDays(d, 1) : rate === 'weekly' ? addDays(d, 7) : addMonths(d, 1)
  return format(nd, 'yyyy-MM-dd')
}

// Русское склонение числительных: plural(2, 'день','дня','дней')
function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

// ── Checkout badge ──
function CheckoutBadge({ date }: { date: string }) {
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  const diff = differenceInDays(d, today)

  if (diff < 0) return <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-lg font-semibold ring-1 ring-red-200">Просрочен {Math.abs(diff)}д</span>
  if (diff === 0) return <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg font-semibold ring-1 ring-orange-200">Выезд сегодня</span>
  if (diff <= 3) return <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg font-semibold ring-1 ring-amber-200">Через {diff}д</span>
  return null
}

// ── CheckIn Form ──
function CheckInForm({ onClose, initialMode = 'checkin' }: { onClose: () => void; initialMode?: 'checkin' | 'booking' }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return {
      unit: '', guest: '', guestName: '', guestPhone: '',
      check_in_date: today,
      expected_check_out_date: addPeriod(today, 'monthly'),
      rate_type: 'monthly' as RateType, rate_amount: '', deposit_amount: '', prepay: '',
    }
  })
  const [mode, setMode] = useState<'checkin' | 'booking'>(initialMode)
  const [guestSearch, setGuestSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [newGuest, setNewGuest] = useState<GuestCreate>({ first_name: '', last_name: '', phone: '', nationality: '', is_foreigner: false })

  const { data: guestResults } = useQuery({
    queryKey: ['guests-search', guestSearch],
    queryFn: () => guestsApi.list(guestSearch),
    enabled: guestSearch.length >= 2,
  })
  const { data: blacklistCheck } = useQuery({
    queryKey: ['blacklist-check', form.guestPhone],
    queryFn: () => blacklistApi.check(form.guestPhone),
    enabled: form.guestPhone.length > 5,
  })
  const { mutate: createGuest, isPending: isCreatingGuest, error: createGuestError } = useMutation({
    mutationFn: (data: GuestCreate) => guestsApi.create(data),
    onSuccess: (guest) => {
      qc.invalidateQueries({ queryKey: ['guests-search'] })
      setForm(f => ({ ...f, guest: String(guest.id), guestName: guest.full_name, guestPhone: guest.phone }))
      setShowQuickCreate(false); setGuestSearch('')
    },
  })
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: propertiesApi.allUnits })
  const availableUnits = units.filter(u => u.status === 'available')
  const { mutate, isPending, error } = useMutation({
    mutationFn: (data: StayCreate) => staysApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stays'] }); qc.invalidateQueries({ queryKey: ['units'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); onClose() },
  })
  const { mutate: book, isPending: booking, error: bookError } = useMutation({
    mutationFn: async (prepay: number) => {
      const stay = await staysApi.create({
        unit: Number(form.unit), guest: Number(form.guest),
        check_in_date: form.check_in_date, expected_check_out_date: form.expected_check_out_date,
        rate_type: form.rate_type, rate_amount: form.rate_amount, deposit_amount: form.deposit_amount || 0,
        status: 'reserved',
      })
      if (prepay > 0) {
        await paymentsApi.create({ stay: stay.id, amount: prepay, payment_date: format(new Date(), 'yyyy-MM-dd'), method: 'kaspi' })
        try { await staysApi.confirm(stay.id) } catch { /* недобор предоплаты — остаётся резервом */ }
      }
      return stay
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stays'] }); qc.invalidateQueries({ queryKey: ['units'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); onClose() },
  })

  const rateLabels: Record<RateType, string> = { daily: 'Суточно', weekly: 'Понедельно', monthly: 'Помесячно' }
  const canSubmit = form.unit && form.guest && form.check_in_date && form.expected_check_out_date && form.rate_amount && !isPending && !booking
  const isBlacklisted = blacklistCheck?.is_blacklisted ?? false

  // Живой расчёт срока, диапазона дат и суммы (повторяет логику total_expected на бэке)
  const calcTotal = (): { duration: string; range: string; total: number; hasRate: boolean } | null => {
    if (!form.check_in_date || !form.expected_check_out_date) return null
    const ci = new Date(form.check_in_date + 'T12:00:00')
    const co = new Date(form.expected_check_out_date + 'T12:00:00')
    const days = differenceInDays(co, ci)
    if (days < 0) return null
    const rate = Number(form.rate_amount)
    const range = `${format(ci, 'd MMMM', { locale: ru })} → ${format(co, 'd MMMM', { locale: ru })}`
    let units = 0, word = ''
    if (form.rate_type === 'daily') {
      units = days; word = plural(days, 'день', 'дня', 'дней')
    } else if (form.rate_type === 'weekly') {
      units = Math.max(Math.ceil(days / 7), 1); word = plural(units, 'неделя', 'недели', 'недель')
    } else {
      let m = differenceInMonths(co, ci)
      if (addMonths(ci, m) < co) m += 1
      units = Math.max(m, 1); word = plural(units, 'месяц', 'месяца', 'месяцев')
    }
    return { duration: `${units} ${word}`, range, total: rate ? rate * units : 0, hasRate: !!rate }
  }
  const calc = calcTotal()

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] shadow-sheet animate-slide-up max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-lg">Новый заезд</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-gray-400" /></button>
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
          {(error || bookError) && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2">{((error || bookError) as any)?.response?.data?.non_field_errors?.[0] ?? 'Ошибка при создании заезда'}</div>}
          {isBlacklisted && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
                <span className="font-semibold text-red-700 text-sm">Гость в чёрном списке!</span>
              </div>
              {blacklistCheck?.entries.map(e => (
                <p key={e.id} className="text-xs text-red-600 ml-6">{e.reason_display}: {e.description.slice(0, 80)}</p>
              ))}
            </div>
          )}

          {/* Unit — grouped by room */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Место / комната *</label>
            <select className="input-field" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              <option value="">— Выберите свободное место —</option>
              {(() => {
                const byRoom = new Map<string, typeof availableUnits>()
                availableUnits.forEach(u => {
                  const rn = u.room_name ?? `Комната ${u.room}`
                  if (!byRoom.has(rn)) byRoom.set(rn, [])
                  byRoom.get(rn)!.push(u)
                })
                return Array.from(byRoom.entries()).map(([roomName, roomUnits]) => (
                  <optgroup key={roomName} label={roomName}>
                    {roomUnits.map(u => {
                      const shortName = u.name.includes('-') ? u.name.split('-')[1] : u.name
                      return <option key={u.id} value={u.id}>{shortName}</option>
                    })}
                  </optgroup>
                ))
              })()}
            </select>
            {availableUnits.length === 0 && <p className="text-xs text-orange-500 mt-1">Нет свободных мест</p>}
          </div>

          {/* Guest */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Гость *</label>
            {form.guest ? (
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isBlacklisted ? 'bg-red-50 border-red-300' : 'bg-primary-50 border-primary-200'}`}>
                <Avatar name={form.guestName} size={32} />
                <span className={`flex-1 font-medium ${isBlacklisted ? 'text-red-800' : 'text-primary-800'}`}>{form.guestName}</span>
                <button onClick={() => setForm(f => ({ ...f, guest: '', guestName: '', guestPhone: '' }))}><X size={16} className={isBlacklisted ? 'text-red-400' : 'text-primary-400'} /></button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input-field pl-9" placeholder="Введите имя или телефон..."
                    value={guestSearch} onChange={e => { setGuestSearch(e.target.value); setShowDropdown(true) }} onFocus={() => setShowDropdown(true)} />
                </div>
                {showDropdown && guestResults?.results && guestResults.results.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {guestResults.results.slice(0, 6).map(g => (
                      <button key={g.id} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0 flex items-center gap-3"
                        onMouseDown={() => { setForm(f => ({ ...f, guest: String(g.id), guestName: g.full_name, guestPhone: g.phone })); setGuestSearch(''); setShowDropdown(false) }}>
                        <Avatar name={g.full_name} size={28} />
                        <div><p className="font-medium text-sm text-gray-900">{g.full_name}</p><p className="text-xs text-gray-400">{g.phone}</p></div>
                        {g.is_blacklisted && <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">ЧС</span>}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && guestSearch.length >= 2 && guestResults?.results?.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100">Гость не найден</div>
                    <button onMouseDown={() => {
                      const isPhone = /^\+?[\d\s\-()]{7,}$/.test(guestSearch)
                      setNewGuest({ first_name: '', last_name: '', phone: isPhone ? guestSearch : '', nationality: '', is_foreigner: false })
                      setShowQuickCreate(true); setShowDropdown(false)
                    }} className="w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-primary-50 text-sm font-medium">
                      <UserPlus size={16} /> Создать нового гостя
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick create guest */}
            {showQuickCreate && !form.guest && (
              <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => setShowQuickCreate(false)} className="text-gray-400 hover:text-gray-600"><ChevronLeft size={16} /></button>
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><UserPlus size={14} className="text-primary-600" /> Новый гость</p>
                </div>
                {createGuestError && <div className="bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2">{(createGuestError as any)?.response?.data?.phone?.[0] ?? 'Ошибка при создании'}</div>}
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-gray-500 mb-1 block">Имя *</label><input className="input-field text-sm" placeholder="Алибек" value={newGuest.first_name} onChange={e => setNewGuest(g => ({ ...g, first_name: e.target.value }))} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Фамилия *</label><input className="input-field text-sm" placeholder="Сейткали" value={newGuest.last_name} onChange={e => setNewGuest(g => ({ ...g, last_name: e.target.value }))} /></div>
                </div>
                <div><label className="text-xs text-gray-500 mb-1 block">Телефон *</label><input className="input-field text-sm" placeholder={PHONE_PLACEHOLDER} value={newGuest.phone} onChange={e => setNewGuest(g => ({ ...g, phone: formatPhoneKZ(e.target.value) }))} /></div>
                <div className="flex items-center gap-3 py-2 border-t border-gray-200">
                  <button type="button" onClick={() => setNewGuest(g => ({ ...g, is_foreigner: !g.is_foreigner, nationality: !g.is_foreigner ? g.nationality : '' }))}
                    className={`relative w-10 h-6 rounded-full transition-colors ${newGuest.is_foreigner ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${newGuest.is_foreigner ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <Globe size={14} className={newGuest.is_foreigner ? 'text-blue-600' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${newGuest.is_foreigner ? 'text-blue-700' : 'text-gray-600'}`}>Иностранный гость</span>
                  </div>
                </div>
                {newGuest.is_foreigner && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Globe size={11} />Гражданство</label>
                    <input className="input-field text-sm" placeholder="напр. Россия, Германия" value={newGuest.nationality ?? ''} onChange={e => setNewGuest(g => ({ ...g, nationality: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Номер паспорта</label>
                        <input className="input-field text-sm" placeholder="N1234567" value={newGuest.document_number ?? ''} onChange={e => setNewGuest(g => ({ ...g, document_number: e.target.value, document_type: 'passport_foreign' }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Пол</label>
                        <select className="input-field text-sm" value={newGuest.sex ?? ''} onChange={e => setNewGuest(g => ({ ...g, sex: e.target.value as 'M' | 'F' | '' }))}>
                          <option value="">—</option>
                          <option value="M">Мужской</option>
                          <option value="F">Женский</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Дата рождения</label>
                        <input type="date" className="input-field text-sm" value={newGuest.date_of_birth ?? ''} onChange={e => setNewGuest(g => ({ ...g, date_of_birth: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Въезд в РК</label>
                        <input type="date" className="input-field text-sm" value={newGuest.entry_date ?? ''} onChange={e => setNewGuest(g => ({ ...g, entry_date: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="text-xs text-gray-500 mb-1 block">Миграционная карта</label>
                      <input className="input-field text-sm" placeholder="Талон / миграционная карта" value={newGuest.migration_card_number ?? ''} onChange={e => setNewGuest(g => ({ ...g, migration_card_number: e.target.value }))} />
                    </div>
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><Clock size={11} />Регистрация в MPIS/eQonaq</p>
                  </div>
                )}
                <button onClick={() => createGuest(newGuest)}
                  disabled={!newGuest.first_name || !newGuest.last_name || !newGuest.phone || isCreatingGuest}
                  className="w-full bg-primary-500 text-white py-2.5 rounded-xl text-sm font-semibold disabled:bg-gray-200 disabled:text-gray-400 tap-card">
                  {isCreatingGuest ? 'Создаём...' : 'Создать и выбрать'}
                </button>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Заезд *</label><input type="date" className="input-field" value={form.check_in_date} onChange={e => setForm(f => ({ ...f, check_in_date: e.target.value, expected_check_out_date: addPeriod(e.target.value, f.rate_type) }))} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Планируемый выезд</label><input type="date" className="input-field" value={form.expected_check_out_date} onChange={e => setForm(f => ({ ...f, expected_check_out_date: e.target.value }))} /></div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Дату выезда всегда можно продлить</p>

          {/* Rate type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Тип оплаты</label>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as RateType[]).map(r => (
                <button key={r} onClick={() => setForm(f => ({ ...f, rate_type: r, expected_check_out_date: addPeriod(f.check_in_date, r) }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition tap-card ${
                    form.rate_type === r ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  {rateLabels[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Rate + deposit */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Ставка (₸) *</label><input type="number" className="input-field" placeholder="80 000" value={form.rate_amount} onChange={e => setForm(f => ({ ...f, rate_amount: e.target.value }))} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Депозит (₸)</label><input type="number" className="input-field" placeholder="0" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} /></div>
          </div>

          {mode === 'booking' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Предоплата (₸)</label>
              <input type="number" className="input-field" placeholder="0 — можно без предоплаты" value={form.prepay} onChange={e => setForm(f => ({ ...f, prepay: e.target.value }))} />
              <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">Внесёте от 50% суммы — бронь станет «подтверждённой». Иначе останется резервом.</p>
            </div>
          )}

          {/* Живой расчёт срока и суммы */}
          {calc && (
            <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-primary-800">{calc.duration}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{calc.range}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-primary-500 font-semibold uppercase">К оплате</p>
                <p className="text-lg font-extrabold text-primary-700">{calc.hasRate ? fmtTg(calc.total) : '—'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100">
          <button onClick={() => mode === 'booking'
            ? book(Number(form.prepay || 0))
            : mutate({ unit: Number(form.unit), guest: Number(form.guest), check_in_date: form.check_in_date, expected_check_out_date: form.expected_check_out_date, rate_type: form.rate_type, rate_amount: form.rate_amount, deposit_amount: form.deposit_amount || 0 })}
            disabled={!canSubmit}
            className={`w-full py-3.5 rounded-xl font-semibold transition tap-card ${mode === 'booking' ? 'bg-violet-500 text-white disabled:bg-gray-200 disabled:text-gray-400' : isBlacklisted ? 'bg-red-600 text-white' : 'bg-primary-500 text-white disabled:bg-gray-200 disabled:text-gray-400'}`}>
            {(isPending || booking) ? (mode === 'booking' ? 'Бронируем...' : 'Создаём заезд...') : mode === 'booking' ? 'Забронировать' : isBlacklisted ? 'Заселить (гость в ЧС)' : 'Заселить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──
export default function StaysPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'stays' | 'bookings'>('stays')
  const [search, setSearch] = useState('')
  const [checkinMode, setCheckinMode] = useState<'checkin' | 'booking' | null>(null)
  const [payStay, setPayStay] = useState<Stay | null>(null)
  const [extendStay, setExtendStay] = useState<Stay | null>(null)
  const [transferStay, setTransferStay] = useState<Stay | null>(null)
  const [mpisStay, setMpisStay] = useState<Stay | null>(null)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['stays'] }); qc.invalidateQueries({ queryKey: ['units'] }); qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const { data: page, isLoading } = useQuery({ queryKey: ['stays'], queryFn: () => staysApi.list() })
  const allStays = page?.results ?? []
  // Заезды = активные + подтверждённые (оплаченные брони); Бронь = резервы без предоплаты
  const stays = allStays.filter(s => s.status === 'active' || s.status === 'confirmed')
  const bookings = allStays.filter(s => s.status === 'reserved')
  const list = tab === 'stays' ? stays : bookings

  const { mutate: checkout } = useMutation({ mutationFn: (id: number) => staysApi.checkout(id), onSuccess: invalidate })
  const { mutate: doCheckIn } = useMutation({ mutationFn: (id: number) => staysApi.checkIn(id), onSuccess: invalidate })
  const { mutate: doCancel } = useMutation({ mutationFn: (id: number) => staysApi.cancel(id), onSuccess: invalidate })

  const fmt = (n: string | number) => Number(n).toLocaleString('ru-KZ', { maximumFractionDigits: 0 }) + ' ₸'

  const q = search.trim().toLowerCase()
  const sortedList = [...list]
    .filter(s => !q || (s.guest_detail?.full_name ?? '').toLowerCase().includes(q) || (s.unit_detail?.name ?? '').toLowerCase().includes(q) || s.check_in_date.includes(q))
    .sort((a, b) => b.check_in_date.localeCompare(a.check_in_date) || b.id - a.id)

  return (
    <div className="px-4 py-4 space-y-3">
      <PageHeader title="Заезды"
        action={tab === 'bookings' ? 'Забронировать' : 'Заселить'} actionIcon={Plus}
        onAction={() => setCheckinMode(tab === 'bookings' ? 'booking' : 'checkin')} />

      <SegmentControl value={tab} onChange={v => setTab(v as 'stays' | 'bookings')}
        options={[
          { value: 'stays', label: `Заезды${stays.length ? ` (${stays.length})` : ''}` },
          { value: 'bookings', label: `Бронь${bookings.length ? ` (${bookings.length})` : ''}` },
        ]} />

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm" placeholder="Поиск: гость, место или дата заезда…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <CalendarClock size={28} className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-500">{tab === 'bookings' ? 'Нет броней' : 'Нет активных заездов'}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedList.map(stay => {
            const balance = Number(stay.balance)
            const paid = Number(stay.total_paid)
            const expected = Number(stay.total_expected)
            const isDebt = balance > 0
            const guestName = stay.guest_detail?.full_name ?? `Гость #${stay.guest}`
            const unitName = stay.unit_detail?.name ?? `Место #${stay.unit}`
            const isForeigner = stay.guest_detail?.is_foreigner ?? false
            const needsMpis = isForeigner && stay.mpis_status !== 'confirmed'
            const isBooking = stay.status === 'reserved'
            const isConfirmed = stay.status === 'confirmed'

            return (
              <div key={stay.id} className={`bg-white rounded-2xl shadow-card overflow-hidden ${
                needsMpis ? 'ring-1 ring-orange-200' : isDebt ? 'ring-1 ring-red-200' : ''
              }`}>
                <div className="px-4 pt-3.5 pb-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={guestName} size={40} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-[15px]">{guestName}</p>
                        <p className="text-xs text-gray-400">{unitName}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {stay.status !== 'active' && <StatusBadge type="stay" status={stay.status} size="xs" />}
                      {stay.mpis_status !== 'not_required' && <MpisBadge status={stay.mpis_status} />}
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs bg-gray-50 rounded-xl p-2.5">
                    <div><p className="text-gray-400 mb-0.5">Заезд</p><p className="font-medium text-gray-700">{stay.check_in_date}</p></div>
                    <div><p className="text-gray-400 mb-0.5">Выезд</p><p className="font-medium text-gray-700">{stay.expected_check_out_date}</p><CheckoutBadge date={stay.expected_check_out_date} /></div>
                    <div><p className="text-gray-400 mb-0.5">Ставка</p><p className="font-medium text-gray-700">{fmt(stay.rate_amount)}</p></div>
                  </div>

                  <div className={`mt-2 flex items-center justify-between text-sm rounded-xl px-3 py-2 ${isDebt ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    <span className={`font-semibold ${isDebt ? 'text-red-700' : 'text-emerald-700'}`}>
                      {isDebt ? `Долг: ${fmt(balance)}` : 'Оплачено'}
                    </span>
                    <span className="text-gray-400 text-xs">{fmt(paid)} / {fmt(expected)}</span>
                  </div>
                </div>

                <div className="flex border-t border-gray-100">
                  <button onClick={() => setPayStay(stay)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition tap-card">
                    <CreditCard size={15} /> Оплата
                  </button>
                  <div className="w-px bg-gray-100" />
                  {isBooking ? (
                    <button onClick={() => setTransferStay(stay)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition tap-card">
                      <CalendarClock size={15} /> Перенести
                    </button>
                  ) : isConfirmed ? (
                    <button onClick={() => doCheckIn(stay.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition tap-card">
                      <Plus size={15} /> Заселить
                    </button>
                  ) : (
                    <button onClick={() => setExtendStay(stay)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition tap-card">
                      <CalendarClock size={15} /> Продлить
                    </button>
                  )}
                  {isForeigner && (<><div className="w-px bg-gray-100" /><button onClick={() => setMpisStay(stay)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition tap-card ${needsMpis ? 'text-orange-600 hover:bg-orange-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                    <Globe size={15} /> {needsMpis ? 'MPIS!' : 'MPIS'}
                  </button></>)}
                  <div className="w-px bg-gray-100" />
                  {(isBooking || isConfirmed) ? (
                    <button onClick={() => { if (confirm(`Удалить бронь ${guestName}?`)) doCancel(stay.id) }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition tap-card">
                      <X size={15} /> Удалить
                    </button>
                  ) : (
                    <button onClick={() => { if (confirm(`Выселить ${guestName}?`)) checkout(stay.id) }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition tap-card">
                      <LogOut size={15} /> Выселить
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {checkinMode && <CheckInForm initialMode={checkinMode} onClose={() => setCheckinMode(null)} />}
      {payStay !== null && <PaymentForm stayId={payStay.id} confirmAfter={payStay.status === 'reserved'} onClose={() => setPayStay(null)} />}
      {extendStay !== null && <ExtendForm stay={extendStay} onClose={() => setExtendStay(null)} />}
      {transferStay !== null && <TransferForm stay={transferStay} onClose={() => setTransferStay(null)} />}
      {mpisStay !== null && <MpisPanel stay={mpisStay} onClose={() => setMpisStay(null)} />}
    </div>
  )
}
