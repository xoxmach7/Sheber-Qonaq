import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staysApi, paymentsApi, guestsApi, propertiesApi, blacklistApi } from '../../api'
import { format, differenceInDays } from 'date-fns'
import {
  Plus, X, LogOut, User, Search, AlertTriangle, UserPlus,
  ChevronLeft, CreditCard, CalendarClock, Banknote, Smartphone,
  Building2, Globe, Copy, ExternalLink, CheckCircle2, Clock,
} from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import type { StayCreate, Stay, PaymentCreate, PaymentMethod, RateType, GuestCreate, MpisStatus } from '../../types'
import type { LucideIcon } from 'lucide-react'

// ── MPIS статус-бейдж ─────────────────────────────────────────────────────────
function MpisBadge({ status }: { status: MpisStatus }) {
  if (status === 'not_required') return null
  const cfg = {
    pending:   { label: 'MPIS: Ожидает',     cls: 'bg-orange-100 text-orange-700' },
    submitted: { label: 'MPIS: Отправлено',   cls: 'bg-blue-100 text-blue-700'   },
    confirmed: { label: 'MPIS: Подтверждено', cls: 'bg-green-100 text-green-700' },
  }[status]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── MPIS панель (clipboard bridge + смена статуса) ────────────────────────────
function MpisPanel({ stay, onClose }: { stay: Stay; onClose: () => void }) {
  const qc = useQueryClient()
  const g = stay.guest_detail
  const [copied, setCopied] = useState(false)

  const clipboardText = [
    `ФИО: ${g?.full_name ?? '—'}`,
    `Телефон: ${g?.phone ?? '—'}`,
    `Гражданство: ${g?.nationality || '—'}`,
    `Документ: ${g?.document_type ? g.document_type.toUpperCase() : '—'} ${g?.document_number ?? ''}`.trim(),
    `Дата заезда: ${stay.check_in_date}`,
    `Место: ${stay.unit_detail?.name ?? `#${stay.unit}`}`,
  ].join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(clipboardText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const { mutate: updateMpis, isPending } = useMutation({
    mutationFn: (s: MpisStatus) => staysApi.updateMpis(stay.id, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stays'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-blue-600" />
            <h3 className="font-bold text-lg">Регистрация MPIS</h3>
          </div>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        {/* Данные для копирования */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Данные для eQonaq</p>
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
            {clipboardText}
          </pre>
        </div>

        {/* Кнопки действий */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border-2 transition ${
              copied
                ? 'bg-green-50 border-green-400 text-green-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
          <a
            href="https://eqonaq.kz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <ExternalLink size={16} />
            Открыть eQonaq
          </a>
        </div>

        {/* Обновить статус */}
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Обновить статус</p>
          <div className="flex gap-2">
            {([
              ['pending',   'Ожидает',     'border-orange-300 text-orange-700'],
              ['submitted', 'Отправлено',  'border-blue-300 text-blue-700'],
              ['confirmed', 'Подтверждено','border-green-300 text-green-700'],
            ] as [MpisStatus, string, string][]).map(([val, label, cls]) => (
              <button
                key={val}
                onClick={() => updateMpis(val)}
                disabled={isPending || stay.mpis_status === val}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition disabled:opacity-40 ${
                  stay.mpis_status === val
                    ? cls + ' bg-opacity-10 opacity-60'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Продление ─────────────────────────────────────────────────────────────────
function ExtendForm({ stay, onClose }: { stay: Stay; onClose: () => void }) {
  const qc = useQueryClient()
  const minDate = (() => {
    const d = new Date(stay.expected_check_out_date)
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()
  const [newDate, setNewDate] = useState(() => {
    const d = new Date(stay.expected_check_out_date)
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => staysApi.extend(stay.id, newDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stays'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const guestName = stay.guest_detail?.full_name ?? `Гость #${stay.guest}`
  const unitName  = stay.unit_detail?.name ?? `Место #${stay.unit}`

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">Продлить проживание</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-400 mb-4">{guestName} · {unitName}</p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-xl px-3 py-2 mb-3">
            {(error as any)?.response?.data?.error ?? 'Ошибка продления'}
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">Текущий выезд</span>
          <span className="font-medium text-gray-700">{stay.expected_check_out_date}</span>
        </div>

        <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">
          Новая дата выезда
        </label>
        <input
          type="date"
          className="input-field mb-4"
          value={newDate}
          min={minDate}
          onChange={e => setNewDate(e.target.value)}
        />

        <button
          onClick={() => mutate()}
          disabled={!newDate || isPending}
          className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400"
        >
          {isPending ? 'Сохраняем...' : `Продлить до ${newDate}`}
        </button>
      </div>
    </div>
  )
}

// ── Оплата ────────────────────────────────────────────────────────────────────
function PaymentForm({ stayId, onClose }: { stayId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')

  const methods: { value: PaymentMethod; label: string; Icon: LucideIcon }[] = [
    { value: 'cash',          label: 'Наличные', Icon: Banknote   },
    { value: 'kaspi',         label: 'Kaspi',    Icon: Smartphone  },
    { value: 'bank_transfer', label: 'Перевод',  Icon: Building2   },
  ]

  const { mutate, isPending } = useMutation({
    mutationFn: (data: PaymentCreate) => paymentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stays'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Принять оплату</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>
        <input
          className="input-field mb-3"
          placeholder="Сумма (₸)"
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <div className="flex gap-2 mb-4">
          {methods.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setMethod(value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition ${
                method === value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => mutate({
            stay: stayId,
            amount,
            payment_date: format(new Date(), 'yyyy-MM-dd'),
            method,
          })}
          disabled={!amount || isPending}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:bg-gray-300"
        >
          {isPending ? 'Сохраняем...' : `Принять ${amount ? Number(amount).toLocaleString('ru') + ' ₸' : ''}`}
        </button>
      </div>
    </div>
  )
}

// ── Форма заселения ───────────────────────────────────────────────────────────
function CheckInForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  const [form, setForm] = useState({
    unit: '',
    guest: '',
    guestName: '',
    guestPhone: '',
    check_in_date: format(new Date(), 'yyyy-MM-dd'),
    expected_check_out_date: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
    rate_type: 'monthly' as RateType,
    rate_amount: '',
    deposit_amount: '',
  })

  const [guestSearch, setGuestSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [newGuest, setNewGuest] = useState<GuestCreate>({
    first_name: '',
    last_name: '',
    phone: '',
    nationality: '',
    is_foreigner: false,
  })

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
      setForm(f => ({
        ...f,
        guest: String(guest.id),
        guestName: guest.full_name,
        guestPhone: guest.phone,
      }))
      setShowQuickCreate(false)
      setGuestSearch('')
    },
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: propertiesApi.allUnits,
  })

  const availableUnits = units.filter(u => u.status === 'available')

  const { mutate, isPending, error } = useMutation({
    mutationFn: (data: StayCreate) => staysApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stays'] })
      qc.invalidateQueries({ queryKey: ['units'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const rateLabels: Record<RateType, string> = {
    daily: 'Суточно', weekly: 'Понедельно', monthly: 'Помесячно',
  }

  const canSubmit = form.unit && form.guest && form.check_in_date
    && form.expected_check_out_date && form.rate_amount && !isPending

  const isBlacklisted = blacklistCheck?.is_blacklisted ?? false

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-lg">Новый заезд</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2">
              {(error as any)?.response?.data?.non_field_errors?.[0] ?? 'Ошибка при создании заезда'}
            </div>
          )}

          {isBlacklisted && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
                <span className="font-semibold text-red-700 text-sm">Гость в чёрном списке!</span>
              </div>
              {blacklistCheck?.entries.map(e => (
                <p key={e.id} className="text-xs text-red-600 ml-6">
                  {e.reason_display}: {e.description.slice(0, 80)}
                </p>
              ))}
            </div>
          )}

          {/* Место */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">
              Место / комната *
            </label>
            <select
              className="input-field"
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            >
              <option value="">— Выберите свободное место —</option>
              {availableUnits.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {availableUnits.length === 0 && (
              <p className="text-xs text-orange-500 mt-1">Нет свободных мест</p>
            )}
          </div>

          {/* Гость */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">
              Гость *
            </label>
            {form.guest ? (
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                isBlacklisted
                  ? 'bg-red-50 border-red-300'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isBlacklisted ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  {isBlacklisted
                    ? <AlertTriangle size={16} className="text-red-600" />
                    : <User size={16} className="text-green-600" />
                  }
                </div>
                <span className={`flex-1 font-medium ${isBlacklisted ? 'text-red-800' : 'text-green-800'}`}>
                  {form.guestName}
                </span>
                <button onClick={() => setForm(f => ({ ...f, guest: '', guestName: '', guestPhone: '' }))}>
                  <X size={16} className={isBlacklisted ? 'text-red-400' : 'text-green-400'} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="input-field pl-9"
                    placeholder="Введите имя или телефон..."
                    value={guestSearch}
                    onChange={e => { setGuestSearch(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                  />
                </div>
                {showDropdown && guestResults?.results && guestResults.results.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {guestResults.results.slice(0, 6).map(g => (
                      <button
                        key={g.id}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0 flex items-center gap-3"
                        onMouseDown={() => {
                          setForm(f => ({
                            ...f,
                            guest: String(g.id),
                            guestName: g.full_name,
                            guestPhone: g.phone,
                          }))
                          setGuestSearch('')
                          setShowDropdown(false)
                        }}
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                          {g.is_blacklisted
                            ? <AlertTriangle size={14} className="text-red-500" />
                            : <User size={14} className="text-gray-500" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{g.full_name}</p>
                          <p className="text-xs text-gray-400">{g.phone}</p>
                        </div>
                        {g.is_blacklisted && (
                          <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">ЧС</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && guestSearch.length >= 2 && guestResults?.results?.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100">
                      Гость не найден
                    </div>
                    <button
                      onMouseDown={() => {
                        const isPhone = /^\+?[\d\s\-()]{7,}$/.test(guestSearch)
                        setNewGuest({
                          first_name: '',
                          last_name: '',
                          phone: isPhone ? guestSearch : '',
                          nationality: '',
                          is_foreigner: false,
                        })
                        setShowQuickCreate(true)
                        setShowDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-primary-50 text-sm font-medium"
                    >
                      <UserPlus size={16} />
                      Создать нового гостя
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Быстрое создание гостя */}
            {showQuickCreate && !form.guest && (
              <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => setShowQuickCreate(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <UserPlus size={14} className="text-primary-600" />
                    Новый гость
                  </p>
                </div>

                {createGuestError && (
                  <div className="bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2">
                    {(createGuestError as any)?.response?.data?.phone?.[0] ?? 'Ошибка при создании'}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Имя *</label>
                    <input
                      className="input-field text-sm"
                      placeholder="Алибек"
                      value={newGuest.first_name}
                      onChange={e => setNewGuest(g => ({ ...g, first_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Фамилия *</label>
                    <input
                      className="input-field text-sm"
                      placeholder="Сейткали"
                      value={newGuest.last_name}
                      onChange={e => setNewGuest(g => ({ ...g, last_name: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Телефон *</label>
                  <input
                    className="input-field text-sm"
                    placeholder="+7 700 000 00 00"
                    value={newGuest.phone}
                    onChange={e => setNewGuest(g => ({ ...g, phone: e.target.value }))}
                  />
                </div>

                {/* Иностранец — toggle */}
                <div className="flex items-center gap-3 py-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setNewGuest(g => ({ ...g, is_foreigner: !g.is_foreigner, nationality: !g.is_foreigner ? g.nationality : '' }))}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      newGuest.is_foreigner ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      newGuest.is_foreigner ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <Globe size={14} className={newGuest.is_foreigner ? 'text-blue-600' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${newGuest.is_foreigner ? 'text-blue-700' : 'text-gray-600'}`}>
                      Иностранный гость
                    </span>
                  </div>
                </div>

                {/* Гражданство (показывать если иностранец) */}
                {newGuest.is_foreigner && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                      <Globe size={11} />
                      Гражданство
                    </label>
                    <input
                      className="input-field text-sm"
                      placeholder="напр. Россия, Германия, Китай"
                      value={newGuest.nationality ?? ''}
                      onChange={e => setNewGuest(g => ({ ...g, nationality: e.target.value }))}
                    />
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      Потребуется регистрация в MPIS/eQonaq
                    </p>
                  </div>
                )}

                <button
                  onClick={() => createGuest(newGuest)}
                  disabled={!newGuest.first_name || !newGuest.last_name || !newGuest.phone || isCreatingGuest}
                  className="w-full bg-primary-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:bg-gray-200 disabled:text-gray-400"
                >
                  {isCreatingGuest ? 'Создаём...' : 'Создать и выбрать'}
                </button>
              </div>
            )}
          </div>

          {/* Даты */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Заезд *</label>
              <input
                type="date" className="input-field"
                value={form.check_in_date}
                onChange={e => setForm(f => ({ ...f, check_in_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">
                Планируемый выезд
              </label>
              <input
                type="date" className="input-field"
                value={form.expected_check_out_date}
                onChange={e => setForm(f => ({ ...f, expected_check_out_date: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">
            Дату выезда всегда можно продлить — она не обязательна
          </p>

          {/* Тип оплаты */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Тип оплаты</label>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as RateType[]).map(r => (
                <button
                  key={r}
                  onClick={() => setForm(f => ({ ...f, rate_type: r }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                    form.rate_type === r
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {rateLabels[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Ставка и депозит */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Ставка (₸) *</label>
              <input
                type="number" className="input-field"
                placeholder="80 000"
                value={form.rate_amount}
                onChange={e => setForm(f => ({ ...f, rate_amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Депозит (₸)</label>
              <input
                type="number" className="input-field"
                placeholder="0"
                value={form.deposit_amount}
                onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100">
          <button
            onClick={() => mutate({
              unit: Number(form.unit),
              guest: Number(form.guest),
              check_in_date: form.check_in_date,
              expected_check_out_date: form.expected_check_out_date,
              rate_type: form.rate_type,
              rate_amount: form.rate_amount,
              deposit_amount: form.deposit_amount || 0,
            })}
            disabled={!canSubmit}
            className={`w-full py-3.5 rounded-xl font-semibold transition ${
              isBlacklisted
                ? 'bg-red-600 text-white'
                : 'bg-primary-600 text-white disabled:bg-gray-200 disabled:text-gray-400'
            }`}
          >
            {isPending
              ? 'Создаём заезд...'
              : isBlacklisted
              ? 'Заселить (гость в ЧС)'
              : 'Заселить'
            }
          </button>
          {!form.guest && (
            <p className="text-center text-xs text-gray-400 mt-2">Выберите гостя из списка</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Индикатор статуса выезда ──────────────────────────────────────────────────
function CheckoutBadge({ date }: { date: string }) {
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  const diff = differenceInDays(d, today)

  if (diff < 0) {
    return (
      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
        Просрочен {Math.abs(diff)}д
      </span>
    )
  }
  if (diff === 0) {
    return (
      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
        Выезд сегодня
      </span>
    )
  }
  if (diff <= 3) {
    return (
      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
        Через {diff}д
      </span>
    )
  }
  return null
}

// ── Главная страница ──────────────────────────────────────────────────────────
export default function StaysPage() {
  const qc = useQueryClient()
  const [showCheckin, setShowCheckin] = useState(false)
  const [payStayId, setPayStayId] = useState<number | null>(null)
  const [extendStay, setExtendStay] = useState<Stay | null>(null)
  const [mpisStay, setMpisStay] = useState<Stay | null>(null)

  const { data: stays = [], isLoading } = useQuery({
    queryKey: ['stays'],
    queryFn: staysApi.active,
  })

  const { mutate: checkout } = useMutation({
    mutationFn: (id: number) => staysApi.checkout(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stays'] })
      qc.invalidateQueries({ queryKey: ['units'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const fmt = (n: string | number) =>
    Number(n).toLocaleString('ru-KZ', { maximumFractionDigits: 0 }) + ' ₸'

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          Заезды
          <span className="ml-2 text-sm font-normal text-gray-400">
            {stays.length} активных
          </span>
        </h2>
        <button
          onClick={() => setShowCheckin(true)}
          className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm"
        >
          <Plus size={16} /> Заселить
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stays.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🏠</p>
          <p>Нет активных заездов</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stays.map(stay => {
            const balance  = Number(stay.balance)
            const paid     = Number(stay.total_paid)
            const expected = Number(stay.total_expected)
            const isDebt   = balance > 0
            const guestName = stay.guest_detail?.full_name ?? `Гость #${stay.guest}`
            const unitName  = stay.unit_detail?.name ?? `Место #${stay.unit}`
            const isForeigner = stay.guest_detail?.is_foreigner ?? false
            const needsMpis = isForeigner && stay.mpis_status !== 'confirmed'

            return (
              <div
                key={stay.id}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
                  needsMpis ? 'border-orange-200' : isDebt ? 'border-red-200' : 'border-gray-100'
                }`}
              >
                {/* Guest + unit header */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isForeigner ? 'bg-blue-100' : 'bg-primary-100'
                      }`}>
                        {isForeigner
                          ? <Globe size={16} className="text-blue-600" />
                          : <User size={16} className="text-primary-600" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{guestName}</p>
                        <p className="text-xs text-gray-400">{unitName}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge type="stay" status={stay.status} />
                      {stay.mpis_status !== 'not_required' && (
                        <MpisBadge status={stay.mpis_status} />
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs bg-gray-50 rounded-xl p-2.5">
                    <div>
                      <p className="text-gray-400 mb-0.5">Заезд</p>
                      <p className="font-medium text-gray-700">{stay.check_in_date}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Планируемый выезд</p>
                      <div className="flex flex-col gap-0.5">
                        <p className="font-medium text-gray-700">{stay.expected_check_out_date}</p>
                        <CheckoutBadge date={stay.expected_check_out_date} />
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Ставка</p>
                      <p className="font-medium text-gray-700">{fmt(stay.rate_amount)}</p>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className={`mt-2 flex items-center justify-between text-sm rounded-xl px-3 py-2 ${
                    isDebt ? 'bg-red-50' : 'bg-green-50'
                  }`}>
                    <span className={`font-medium ${isDebt ? 'text-red-700' : 'text-green-700'}`}>
                      {isDebt ? `Долг: ${fmt(balance)}` : 'Оплачено'}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {fmt(paid)} / {fmt(expected)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-gray-100">
                  <button
                    onClick={() => setPayStayId(stay.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition"
                  >
                    <CreditCard size={15} /> Оплата
                  </button>
                  <div className="w-px bg-gray-100" />
                  <button
                    onClick={() => setExtendStay(stay)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-sky-600 hover:bg-sky-50 transition"
                  >
                    <CalendarClock size={15} /> Продлить
                  </button>
                  {isForeigner && (
                    <>
                      <div className="w-px bg-gray-100" />
                      <button
                        onClick={() => setMpisStay(stay)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition ${
                          needsMpis
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        <Globe size={15} />
                        {needsMpis ? 'MPIS!' : 'MPIS'}
                      </button>
                    </>
                  )}
                  <div className="w-px bg-gray-100" />
                  <button
                    onClick={() => {
                      if (confirm(`Выселить ${guestName}?`)) checkout(stay.id)
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition"
                  >
                    <LogOut size={15} /> Выселить
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCheckin && <CheckInForm onClose={() => setShowCheckin(false)} />}
      {payStayId !== null && (
        <PaymentForm stayId={payStayId} onClose={() => setPayStayId(null)} />
      )}
      {extendStay !== null && (
        <ExtendForm stay={extendStay} onClose={() => setExtendStay(null)} />
      )}
      {mpisStay !== null && (
        <MpisPanel stay={mpisStay} onClose={() => setMpisStay(null)} />
      )}
    </div>
  )
}
