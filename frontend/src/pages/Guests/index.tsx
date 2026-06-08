import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { guestsApi, blacklistApi } from '../../api'
import {
  Search, Plus, Phone, User, AlertTriangle, X,
  ShieldAlert, ShieldOff,
  Banknote, Lock, Hammer, UserX, VolumeX, HelpCircle,
} from 'lucide-react'
import type { GuestCreate, BlacklistCreate, BlacklistReason } from '../../types'
import type { LucideIcon } from 'lucide-react'

// ── Форма нового гостя ────────────────────────────────────────────────────────
function GuestForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<GuestCreate>({
    first_name: '', last_name: '', phone: '',
  })
  const [error, setError] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: guestsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guests'] })
      onClose()
    },
    onError: () => setError('Ошибка при создании. Проверьте данные.'),
  })

  const set = (k: keyof GuestCreate, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Новый гость</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>
        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-3">{error}</div>
        )}
        <div className="space-y-3">
          <input className="input-field" placeholder="Фамилия *"
            value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          <input className="input-field" placeholder="Имя *"
            value={form.first_name} onChange={e => set('first_name', e.target.value)} />
          <input className="input-field" placeholder="Отчество"
            value={form.middle_name ?? ''} onChange={e => set('middle_name', e.target.value)} />
          <input className="input-field" placeholder="Телефон * (+7...)" type="tel"
            value={form.phone} onChange={e => set('phone', e.target.value)} />
          <input className="input-field" placeholder="Email" type="email"
            value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
          <input className="input-field" placeholder="ИИН (12 цифр)"
            value={form.iin ?? ''} onChange={e => set('iin', e.target.value)} />
          <textarea className="input-field resize-none" placeholder="Заметки" rows={2}
            value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
        </div>
        <button
          onClick={() => mutate(form)}
          disabled={isPending || !form.first_name || !form.last_name || !form.phone}
          className="w-full mt-4 bg-primary-600 text-white py-3 rounded-xl font-semibold disabled:bg-gray-300 transition"
        >
          {isPending ? 'Сохраняем...' : 'Создать гостя'}
        </button>
      </div>
    </div>
  )
}

// ── Форма добавления в ЧС ─────────────────────────────────────────────────────
const REASON_OPTIONS: {
  value: BlacklistReason
  label: string
  Icon: LucideIcon
}[] = [
  { value: 'debt',      label: 'Долг / не заплатил', Icon: Banknote  },
  { value: 'theft',     label: 'Кража',               Icon: Lock      },
  { value: 'vandalism', label: 'Вандализм',            Icon: Hammer    },
  { value: 'fraud',     label: 'Мошенничество',        Icon: UserX     },
  { value: 'behavior',  label: 'Нарушение порядка',    Icon: VolumeX   },
  { value: 'other',     label: 'Другое',               Icon: HelpCircle},
]

function BlacklistForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<BlacklistCreate>({
    full_name: '',
    phone: '',
    iin: '',
    reason: 'debt',
    description: '',
    evidence_url: '',
  })
  const [error, setError] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: blacklistApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blacklist'] })
      onClose()
    },
    onError: (e: any) =>
      setError(e?.response?.data?.detail ?? 'Ошибка при добавлении в чёрный список'),
  })

  const set = (k: keyof BlacklistCreate, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const canSubmit = form.full_name && (form.phone || form.iin) && form.description && !isPending

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-red-100">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-600" />
            <h3 className="font-bold text-lg">Добавить в чёрный список</h3>
          </div>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
            ⚠ Запись видна всем объектам платформы. Убедитесь в достоверности.
          </div>

          <input className="input-field" placeholder="ФИО *"
            value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          <input className="input-field" placeholder="Телефон (+7...)" type="tel"
            value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} />
          <input className="input-field" placeholder="ИИН (12 цифр)"
            value={form.iin ?? ''} onChange={e => set('iin', e.target.value)} />
          <p className="text-xs text-gray-400 -mt-1">Укажите телефон и/или ИИН</p>

          {/* Причина */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Причина *</label>
            <div className="grid grid-cols-2 gap-2">
              {REASON_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => set('reason', value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition ${
                    form.reason === value
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  <Icon size={14} className={form.reason === value ? 'text-white' : 'text-gray-400'} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">
              Описание инцидента *
            </label>
            <textarea
              className="input-field resize-none"
              placeholder="Опишите что произошло..."
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <input
            className="input-field"
            placeholder="Ссылка на доказательство (фото, видео)"
            value={form.evidence_url ?? ''}
            onChange={e => set('evidence_url', e.target.value)}
          />
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100">
          <button
            onClick={() => mutate(form)}
            disabled={!canSubmit}
            className="w-full bg-red-600 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 transition"
          >
            {isPending ? 'Добавляем...' : '⛔ Добавить в чёрный список'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Список гостей ─────────────────────────────────────────────────────────────
function GuestsList({ search }: { search: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['guests', search],
    queryFn: () => guestsApi.list(search || undefined),
    placeholderData: prev => prev,
  })
  const guests = data?.results ?? []

  if (isLoading) return <Spinner />

  if (guests.length === 0) return (
    <div className="text-center py-12 text-gray-400">
      {search ? 'Гости не найдены' : 'Гостей пока нет'}
    </div>
  )

  return (
    <div className="space-y-2">
      {guests.map(guest => (
        <div
          key={guest.id}
          className={`bg-white rounded-2xl shadow-sm border px-4 py-3 flex items-center gap-3 ${
            guest.is_blacklisted ? 'border-red-200 bg-red-50' : 'border-gray-100'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            guest.is_blacklisted ? 'bg-red-100' : 'bg-primary-100'
          }`}>
            {guest.is_blacklisted
              ? <AlertTriangle size={18} className="text-red-600" />
              : <User size={18} className="text-primary-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 truncate">{guest.full_name}</p>
              {guest.is_blacklisted && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full shrink-0">ЧС</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Phone size={12} />
              <span>{guest.phone}</span>
            </div>
            {guest.iin && guest.iin !== '***' && (
              <p className="text-xs text-gray-400">ИИН: {guest.iin}</p>
            )}
          </div>
        </div>
      ))}
      {(data?.count ?? 0) > guests.length && (
        <p className="text-center text-sm text-gray-400 py-2">
          Показано {guests.length} из {data?.count}
        </p>
      )}
    </div>
  )
}

// ── Чёрный список ─────────────────────────────────────────────────────────────
function BlacklistTab({ search }: { search: string }) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['blacklist', search],
    queryFn: () => blacklistApi.list(search || undefined),
  })
  const entries = data?.results ?? []

  const { mutate: deactivate } = useMutation({
    mutationFn: blacklistApi.deactivate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blacklist'] }),
  })

  if (isLoading) return <Spinner />

  if (entries.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-4xl mb-2">✅</p>
      <p className="font-medium text-gray-600">Чёрный список пуст</p>
      <p className="text-sm mt-1">Нет проблемных гостей</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {entries.map(entry => (
        <div
          key={entry.id}
          className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden"
        >
          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <ShieldAlert size={16} className="text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{entry.full_name}</p>
                  <p className="text-xs text-gray-500">{entry.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {entry.is_verified && (
                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                    Подтверждён
                  </span>
                )}
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {entry.reason_display}
                </span>
              </div>
            </div>

            <p className="mt-2 text-sm text-gray-600 bg-red-50 rounded-xl px-3 py-2">
              {entry.description}
            </p>

            {entry.reported_by_name && (
              <p className="text-xs text-gray-400 mt-1.5">
                Добавлено: {entry.reported_by_name} · {entry.created_at.slice(0, 10)}
              </p>
            )}
          </div>

          <div className="border-t border-red-50 px-4 py-2.5">
            <button
              onClick={() => {
                if (confirm(`Убрать "${entry.full_name}" из чёрного списка?`)) {
                  deactivate(entry.id)
                }
              }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ShieldOff size={14} />
              Убрать из чёрного списка
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── Главная страница ──────────────────────────────────────────────────────────
export default function GuestsPage() {
  const [tab, setTab] = useState<'guests' | 'blacklist'>('guests')
  const [search, setSearch] = useState('')
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [showBlacklistForm, setShowBlacklistForm] = useState(false)

  // Счётчик ЧС
  const { data: blData } = useQuery({
    queryKey: ['blacklist', ''],
    queryFn: () => blacklistApi.list(),
  })
  const blacklistCount = blData?.count ?? 0

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Гости</h2>
        <button
          onClick={() => tab === 'guests' ? setShowGuestForm(true) : setShowBlacklistForm(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold shadow-sm ${
            tab === 'blacklist'
              ? 'bg-red-600 text-white'
              : 'bg-primary-600 text-white'
          }`}
        >
          <Plus size={16} />
          {tab === 'guests' ? 'Гость' : 'В ЧС'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab('guests')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'guests'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          Все гости
        </button>
        <button
          onClick={() => setTab('blacklist')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 ${
            tab === 'blacklist'
              ? 'bg-white text-red-700 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          <ShieldAlert size={14} />
          Чёрный список
          {blacklistCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === 'blacklist'
                ? 'bg-red-100 text-red-700'
                : 'bg-red-500 text-white'
            }`}>
              {blacklistCount}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={tab === 'guests' ? 'Поиск по имени или телефону...' : 'Поиск в чёрном списке...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      {tab === 'guests'
        ? <GuestsList search={search} />
        : <BlacklistTab search={search} />
      }

      {showGuestForm && <GuestForm onClose={() => setShowGuestForm(false)} />}
      {showBlacklistForm && <BlacklistForm onClose={() => setShowBlacklistForm(false)} />}
    </div>
  )
}
