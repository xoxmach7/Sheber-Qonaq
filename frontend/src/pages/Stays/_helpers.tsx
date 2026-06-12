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
import type { StayCreate, Stay, PaymentCreate, PaymentMethod, RateType, GuestCreate, MpisStatus } from '../../types'
import type { LucideIcon } from 'lucide-react'

// ── MPIS badge ──
function MpisBadge({ status }: { status: MpisStatus }) {
  if (status === 'not_required') return null
  const cfg = {
    pending:   { label: 'MPIS: Ожидает',     cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
    submitted: { label: 'MPIS: Отправлено',   cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
    confirmed: { label: 'MPIS: Подтверждено', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  }[status]
  return <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${cfg.cls}`}>{cfg.label}</span>
}

// ── MPIS Panel ──
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
            <h3 className="font-bold text-lg">Регистрация MPIS</h3>
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

// ── Payment Form ──
function PaymentForm({ stayId, onClose }: { stayId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const methods: { value: PaymentMethod; label: string; Icon: LucideIcon }[] = [
    { value: 'cash', label: 'Наличные', Icon: Banknote },
    { value: 'kaspi', label: 'Kaspi', Icon: Smartphone },
    { value: 'bank_transfer', label: 'Перевод', Icon: Building2 },
  ]

  const { mutate, isPending } = useMutation({
    mutationFn: (data: PaymentCreate) => paymentsApi.create(data),
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
          className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 tap-card">
          {isPending ? 'Сохраняем...' : `Принять ${amount ? Number(amount).toLocaleString('ru') + ' ₸' : ''}`}
        </button>
      </div>
    </div>
  )
}

export { MpisBadge, MpisPanel, ExtendForm, PaymentForm }
