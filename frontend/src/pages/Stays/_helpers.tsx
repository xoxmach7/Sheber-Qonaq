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
import { Avatar, PageHeader } from '../../components/ui'
import { addPeriod } from '../../lib/dates'
import type { StayCreate, Stay, PaymentCreate, PaymentMethod, RateType, GuestCreate, MpisStatus } from '../../types'
import type { LucideIcon } from 'lucide-react'

// ── Уведомление о прибытии (Увед.) — бывш. MPIS ──
function MpisBadge({ status }: { status: MpisStatus }) {
  if (status === 'not_required') return null
  const cfg = {
    pending:   { label: 'Увед.: Ожидает',     cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
    submitted: { label: 'Увед.: Отправлено',   cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
    confirmed: { label: 'Увед.: Подтверждено', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  }[status]
  return <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${cfg.cls}`}>{cfg.label}</span>
}

// ── Панель уведомления о прибытии ──
function MpisPanel({ stay, onClose }: { stay: Stay; onClose: () => void }) {
  const qc = useQueryClient()
  const g = stay.guest_detail
  const [copied, setCopied] = useState(false)

  const docTypeLabel: Record<string, string> = {
    passport_foreign: 'Иностранный паспорт',
    passport_kz: 'Паспорт РК',
    id_card: 'Удостоверение РК',
    residence_permit: 'ВНЖ',
    other: 'Документ',
  }
  const sexLabel = g?.sex === 'M' ? 'Мужской' : g?.sex === 'F' ? 'Женский' : ''
  const clipboardText = [
    `ФИО: ${g?.full_name ?? '—'}`,
    sexLabel && `Пол: ${sexLabel}`,
    g?.date_of_birth && `Дата рождения: ${g.date_of_birth}`,
    `Гражданство: ${g?.nationality || '—'}`,
    (g?.document_number || g?.document_type) &&
      `Документ: ${docTypeLabel[g?.document_type ?? ''] ?? g?.document_type ?? ''} ${g?.document_number ?? ''}`.trim(),
    (g?.document_issue_date || g?.document_expiry_date) &&
      `Паспорт: выдан ${g?.document_issue_date ?? '—'}, действует до ${g?.document_expiry_date ?? '—'}`,
    g?.entry_date && `Въезд в РК: ${g.entry_date}`,
    g?.migration_card_number && `Миграционная карта: ${g.migration_card_number}`,
    `Телефон: ${g?.phone ?? '—'}`,
    `Дата заезда: ${stay.check_in_date}`,
    `Место: ${stay.unit_detail?.name ?? `#${stay.unit}`}`,
  ].filter(Boolean).join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(clipboardText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const { mutate: updateMpis, isPending } = useMutation({
    mutationFn: (s: MpisStatus) => staysApi.updateMpis(stay.id, s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stays'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-blue-600" />
            <h3 className="font-bold text-lg">Уведомление о прибытии</h3>
          </div>
          <button onClick={onClose} className="p-1"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Данные для eQonaq</p>
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">{clipboardText}</pre>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleCopy}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border-2 transition tap-card ${
              copied ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-gray-200 text-gray-700'
            }`}>
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
          <a href="https://eqonaq.kz" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-blue-600 text-white tap-card">
            <ExternalLink size={16} /> Открыть eQonaq
          </a>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Обновить статус</p>
          <div className="flex gap-2">
            {([['pending','Ожидает','border-orange-300 text-orange-700'],['submitted','Отправлено','border-blue-300 text-blue-700'],['confirmed','Подтверждено','border-emerald-300 text-emerald-700']] as [MpisStatus,string,string][]).map(([val,label,cls]) => (
              <button key={val} onClick={() => updateMpis(val)}
                disabled={isPending || stay.mpis_status === val}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition disabled:opacity-40 ${
                  stay.mpis_status === val ? cls + ' opacity-60' : 'bg-white border-gray-200 text-gray-600'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Extend Form ──
function ExtendForm({ stay, onClose }: { stay: Stay; onClose: () => void }) {
  const qc = useQueryClient()
  const minDate = (() => { const d = new Date(stay.expected_check_out_date); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })()
  const [newDate, setNewDate] = useState(() => { const d = new Date(stay.expected_check_out_date); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => staysApi.extend(stay.id, newDate),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stays'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up">
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">Продлить проживание</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-400 mb-4">{stay.guest_detail?.full_name} · {stay.unit_detail?.name}</p>
        {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-3 py-2 mb-3">{(error as any)?.response?.data?.error ?? 'Ошибка продления'}</div>}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">Текущий выезд</span>
          <span className="font-medium text-gray-700">{stay.expected_check_out_date}</span>
        </div>
        <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Новая дата выезда</label>
        <input type="date" className="input-field mb-4" value={newDate} min={minDate} onChange={e => setNewDate(e.target.value)} />
        <button onClick={() => mutate()} disabled={!newDate || isPending}
          className="w-full bg-primary-500 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 tap-card">
          {isPending ? 'Сохраняем...' : `Продлить до ${newDate}`}
        </button>
      </div>
    </div>
  )
}

// ── Adjust Total Form — ручная корректировка суммы к оплате ──
function AdjustTotalForm({ stay, onClose }: { stay: Stay; onClose: () => void }) {
  const qc = useQueryClient()
  const autoTotal = Number(stay.total_expected)
  const [amount, setAmount] = useState(stay.manual_total_override ?? String(autoTotal))

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => staysApi.updateTotalOverride(stay.id, amount === '' ? null : Number(amount)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stays'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); onClose() },
  })

  const resetToAuto = () => {
    setAmount('')
    staysApi.updateTotalOverride(stay.id, null).then(() => {
      qc.invalidateQueries({ queryKey: ['stays'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up">
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">Сумма к оплате</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-400 mb-4">{stay.guest_detail?.full_name} · {stay.unit_detail?.name}</p>
        {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-3 py-2 mb-3">Не удалось сохранить</div>}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">Автоматический расчёт по тарифу</span>
          <span className="font-medium text-gray-700">{autoTotal.toLocaleString('ru')} ₸</span>
        </div>
        <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Сумма вручную (₸)</label>
        <input type="number" className="input-field mb-3" value={amount} onChange={e => setAmount(e.target.value)} placeholder={String(autoTotal)} />
        {stay.manual_total_override != null && (
          <button onClick={resetToAuto} className="text-sm text-primary-600 font-semibold mb-4">
            Вернуть автоматический расчёт
          </button>
        )}
        <button onClick={() => mutate()} disabled={amount === '' || isPending}
          className="w-full bg-primary-500 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 tap-card">
          {isPending ? 'Сохраняем...' : 'Сохранить сумму'}
        </button>
      </div>
    </div>
  )
}

// ── Payment Form ──
function PaymentForm({ stayId, onClose, confirmAfter = false }: { stayId: number; onClose: () => void; confirmAfter?: boolean }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const methods: { value: PaymentMethod; label: string; Icon: LucideIcon }[] = [
    { value: 'cash', label: 'Наличные', Icon: Banknote },
    { value: 'kaspi', label: 'Kaspi', Icon: Smartphone },
    { value: 'bank_transfer', label: 'Перевод', Icon: Building2 },
  ]

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: PaymentCreate) => {
      await paymentsApi.create(data)
      // Для брони: если предоплата достигла порога — confirm переведёт её в Заезды
      if (confirmAfter) { try { await staysApi.confirm(stayId) } catch { /* недобор — остаётся бронью */ } }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stays'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up">
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Принять оплату</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-gray-400" /></button>
        </div>
        <input className="input-field mb-3" placeholder="Сумма (₸)" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
        <div className="flex gap-2 mb-4">
          {methods.map(({ value, label, Icon }) => (
            <button key={value} onClick={() => setMethod(value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border-2 transition tap-card ${
                method === value ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200'
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        <button onClick={() => mutate({ stay: stayId, amount, payment_date: format(new Date(), 'yyyy-MM-dd'), method })}
          disabled={!amount || isPending}
          className="w-full bg-primary-500 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 tap-card">
          {isPending ? 'Сохраняем...' : `Принять ${amount ? Number(amount).toLocaleString('ru') + ' ₸' : ''}`}
        </button>
      </div>
    </div>
  )
}

// ── Transfer Form (перенос дат брони) ──
function TransferForm({ stay, onClose }: { stay: Stay; onClose: () => void }) {
  const qc = useQueryClient()
  const [ci, setCi] = useState(stay.check_in_date)
  const [co, setCo] = useState(stay.expected_check_out_date)

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => staysApi.updateDates(stay.id, ci, co),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stays'] }); qc.invalidateQueries({ queryKey: ['units'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up">
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">Перенести бронь</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-400 mb-4">{stay.guest_detail?.full_name} · {stay.unit_detail?.name}</p>
        {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-3 py-2 mb-3">{(error as any)?.response?.data?.non_field_errors?.[0] ?? 'Эти даты заняты или некорректны'}</div>}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Заезд</label><input type="date" className="input-field" value={ci} onChange={e => { setCi(e.target.value); setCo(addPeriod(e.target.value, stay.rate_type)) }} /></div>
          <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Выезд</label><input type="date" className="input-field" value={co} onChange={e => setCo(e.target.value)} /></div>
        </div>
        <p className="text-xs text-gray-400 -mt-2 mb-4">Дата выезда пересчитывается по тарифу ({stay.rate_type_display?.toLowerCase() ?? stay.rate_type}), но её можно поправить вручную</p>
        <button onClick={() => mutate()} disabled={!ci || !co || isPending}
          className="w-full bg-primary-500 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 tap-card">
          {isPending ? 'Сохраняем...' : 'Перенести'}
        </button>
      </div>
    </div>
  )
}

export { MpisBadge, MpisPanel, ExtendForm, AdjustTotalForm, PaymentForm, TransferForm }
