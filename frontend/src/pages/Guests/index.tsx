import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { guestsApi, blacklistApi } from '../../api'
import {
  Plus, Phone, User, X,
  ShieldAlert, ShieldOff,
  Banknote, Lock, Hammer, UserX, VolumeX, HelpCircle, Pencil, Trash2,
} from 'lucide-react'
import type { Guest, GuestCreate, BlacklistCreate, BlacklistReason, BlacklistEntry } from '../../types'
import type { LucideIcon } from 'lucide-react'
import { Avatar, PageHeader, SegmentControl, SearchBar, EmptyState } from '../../components/ui'
import { formatPhoneKZ, PHONE_PLACEHOLDER } from '../../lib/phone'

// ─── Guest Form (create / edit) ──────────────────────────────────────────────
function GuestForm({
  onClose,
  initial,
}: {
  onClose: () => void
  initial?: Guest
}) {
  const qc = useQueryClient()
  const isEdit = !!initial

  const [form, setForm] = useState<GuestCreate>(
    initial
      ? {
          first_name: initial.first_name ?? '',
          last_name: initial.last_name ?? '',
          middle_name: initial.middle_name ?? '',
          phone: initial.phone ?? '',
          email: initial.email ?? '',
          iin: initial.iin ?? '',
          notes: initial.notes ?? '',
          nationality: initial.nationality ?? '',
          is_foreigner: initial.is_foreigner ?? false,
          document_type: initial.document_type,
          document_number: initial.document_number ?? '',
          sex: initial.sex ?? '',
          date_of_birth: initial.date_of_birth ?? '',
          document_issue_date: initial.document_issue_date ?? '',
          document_expiry_date: initial.document_expiry_date ?? '',
          entry_date: initial.entry_date ?? '',
          migration_card_number: initial.migration_card_number ?? '',
        }
      : { first_name: '', last_name: '', phone: '', is_foreigner: false }
  )
  const [error, setError] = useState('')

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: guestsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['guests'] }); onClose() },
    onError: () => setError('Ошибка при создании. Проверьте данные.'),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: (data: Partial<GuestCreate>) => guestsApi.update(initial!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['guests'] }); onClose() },
    onError: () => setError('Ошибка при сохранении.'),
  })

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: () => guestsApi.remove(initial!.id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['guests'] })
      if (res?.archived) {
        alert('Гость архивирован: у него есть история заселений, поэтому финансовые данные сохранены.')
      }
      onClose()
    },
    onError: () => setError('Не удалось удалить гостя.'),
  })

  const isPending = creating || updating
  const set = (k: keyof GuestCreate, v: string) => setForm(f => ({ ...f, [k]: v }))
  const toggleForeigner = () => setForm(f => ({ ...f, is_foreigner: !f.is_foreigner, iin: '', document_type: !f.is_foreigner ? 'passport_foreign' : undefined }))
  const handleSave = () => isEdit ? update(form) : create(form)
  const handleDelete = () => {
    if (confirm(`Удалить гостя «${initial!.full_name}»? Если есть история заселений — он будет архивирован.`)) remove()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up max-h-[92vh] overflow-y-auto">
        <div className="flex justify-center mb-3">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{isEdit ? 'Редактировать гостя' : 'Новый гость'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-3 py-2 mb-3">{error}</div>}

        {/* Иностранный гость */}
        <button
          type="button"
          onClick={toggleForeigner}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border mb-3 transition ${
            form.is_foreigner
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">&#127757;</span>
            <span className="text-sm font-semibold">Иностранный гость</span>
          </div>
          <div className={`w-11 h-6 rounded-full relative transition-colors ${form.is_foreigner ? 'bg-blue-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_foreigner ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
        </button>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Фамилия *</label>
            <input className="input-field" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Имя *</label>
            <input className="input-field" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Отчество</label>
            <input className="input-field" value={form.middle_name ?? ''} onChange={e => set('middle_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Телефон</label>
            <input className="input-field" placeholder={PHONE_PLACEHOLDER} type="tel" value={form.phone} onChange={e => set('phone', formatPhoneKZ(e.target.value))} />
          </div>

          {form.is_foreigner ? (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-3">
              <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                <span>&#127757;</span> Данные для МПИС / eQonaq
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Гражданство *</label>
                <input className="input-field" placeholder="Россия, Узбекистан..."
                  value={form.nationality ?? ''} onChange={e => set('nationality', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Номер паспорта</label>
                  <input className="input-field" placeholder="N1234567"
                    value={form.document_number ?? ''} onChange={e => set('document_number', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Пол</label>
                  <select className="input-field" value={form.sex ?? ''} onChange={e => set('sex', e.target.value)}>
                    <option value="">—</option>
                    <option value="M">Мужской</option>
                    <option value="F">Женский</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Дата рождения</label>
                  <input type="date" className="input-field" value={form.date_of_birth ?? ''} onChange={e => set('date_of_birth', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Паспорт выдан</label>
                  <input type="date" className="input-field" value={form.document_issue_date ?? ''} onChange={e => set('document_issue_date', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Действует до</label>
                  <input type="date" className="input-field" value={form.document_expiry_date ?? ''} onChange={e => set('document_expiry_date', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Въезд в РК</label>
                  <input type="date" className="input-field" value={form.entry_date ?? ''} onChange={e => set('entry_date', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Номер миграционной карты</label>
                <input className="input-field" placeholder="Талон / миграционная карта"
                  value={form.migration_card_number ?? ''} onChange={e => set('migration_card_number', e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">ИИН</label>
              <input className="input-field" placeholder="12 цифр" value={form.iin ?? ''} onChange={e => set('iin', e.target.value)} />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Заметки</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending || !form.first_name || !form.last_name || !form.phone}
          className="w-full mt-4 bg-primary-500 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 transition tap-card">
          {isPending ? 'Сохраняем...' : isEdit ? 'Сохранить изменения' : 'Создать гостя'}
        </button>

        {isEdit && (
          <button
            onClick={handleDelete}
            disabled={removing}
            className="w-full mt-2 flex items-center justify-center gap-2 text-red-600 py-3 rounded-xl font-medium hover:bg-red-50 disabled:opacity-50 transition">
            <Trash2 size={16} /> {removing ? 'Удаляем...' : 'Удалить гостя'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Blacklist form ───────────────────────────────────────────────────────────
const REASON_OPTIONS: { value: BlacklistReason; label: string; Icon: LucideIcon }[] = [
  { value: 'debt',      label: 'Долг / не заплатил', Icon: Banknote },
  { value: 'theft',     label: 'Кража',               Icon: Lock },
  { value: 'vandalism', label: 'Вандализм',            Icon: Hammer },
  { value: 'fraud',     label: 'Мошенничество',        Icon: UserX },
  { value: 'behavior',  label: 'Нарушение порядка',    Icon: VolumeX },
  { value: 'other',     label: 'Другое',               Icon: HelpCircle },
]

function BlacklistForm({ onClose, initial }: { onClose: () => void; initial?: BlacklistEntry }) {
  const qc = useQueryClient()
  const isEdit = !!initial
  const [form, setForm] = useState<BlacklistCreate>({
    full_name: initial?.full_name ?? '',
    phone: initial?.phone ?? '',
    iin: '',
    guest: initial?.guest ?? null,
    reason: initial?.reason ?? 'debt',
    description: initial?.description ?? '',
    evidence_url: initial?.evidence_url ?? '',
  })
  const [error, setError] = useState('')
  const { data: guestList } = useQuery({ queryKey: ['guests', ''], queryFn: () => guestsApi.list() })
  const guests = guestList?.results ?? []

  const { mutate, isPending } = useMutation({
    mutationFn: (data: BlacklistCreate) =>
      isEdit ? blacklistApi.update(initial!.id, data) : blacklistApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blacklist'] }); onClose() },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Ошибка при сохранении'),
  })

  const set = (k: keyof BlacklistCreate, v: string) => setForm(f => ({ ...f, [k]: v }))
  // ИИН на редактировании не трогаем, если поле пустое (он маскируется при чтении)
  const submit = () => {
    const payload = { ...form }
    if (isEdit && !payload.iin) delete (payload as any).iin
    mutate(payload)
  }
  const canSubmit = (form.guest || (isEdit && form.full_name)) && !isPending

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] shadow-sheet animate-slide-up max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-red-100">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-600" />
            <h3 className="font-bold text-lg">{isEdit ? 'Редактировать нарушение' : 'Добавить нарушение'}</h3>
          </div>
          <button onClick={onClose} className="p-1"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
          {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2">{error}</div>}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
            Запись видна всем объектам платформы. Убедитесь в достоверности.
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Гость *</label>
            <select className="input-field" value={form.guest ?? ''} onChange={e => setForm(f => ({ ...f, guest: e.target.value ? Number(e.target.value) : null }))}>
              <option value="">— Выберите гостя —</option>
              {guests.map(g => <option key={g.id} value={g.id}>{g.full_name} · {g.phone}</option>)}
            </select>
            {isEdit && form.full_name && !form.guest && <p className="text-xs text-gray-400 mt-1">Запись по: {form.full_name}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Причина *</label>
            <div className="grid grid-cols-2 gap-2">
              {REASON_OPTIONS.map(({ value, label, Icon }) => (
                <button key={value} onClick={() => set('reason', value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition tap-card ${
                    form.reason === value ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  <Icon size={14} className={form.reason === value ? 'text-white' : 'text-gray-400'} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Описание инцидента</label>
            <textarea className="input-field resize-none" placeholder="Опишите что произошло (необязательно)..." rows={3}
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <input className="input-field" placeholder="Ссылка на доказательство (фото, видео)"
            value={form.evidence_url ?? ''} onChange={e => set('evidence_url', e.target.value)} />
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-gray-100">
          <button onClick={submit} disabled={!canSubmit}
            className="w-full bg-red-600 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 transition tap-card">
            {isPending ? 'Сохраняем...' : isEdit ? 'Сохранить изменения' : 'Добавить нарушение'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Guests list ──────────────────────────────────────────────────────────────
function GuestsList({ search }: { search: string }) {
  const [editGuest, setEditGuest] = useState<Guest | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['guests', search],
    queryFn: () => guestsApi.list(search || undefined),
    placeholderData: prev => prev,
  })
  const guests = data?.results ?? []

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (guests.length === 0) return <EmptyState icon={User} title={search ? 'Гости не найдены' : 'Гостей пока нет'} />

  return (
    <>
      <div className="space-y-2">
        {guests.map(guest => (
          <div
            key={guest.id}
            onClick={() => setEditGuest(guest)}
            className={`tap-card flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-card cursor-pointer ${
              guest.is_blacklisted ? 'border-l-[3px] border-red-500' : ''
            }`}>
            <Avatar name={guest.full_name} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[15px] font-semibold text-gray-900 truncate">{guest.full_name}</p>
                {guest.is_blacklisted && (
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">ЧС</span>
                )}
                {guest.is_foreigner && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                    {guest.nationality ?? 'Иностр.'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[13px] text-gray-500 mt-0.5">
                <Phone size={12} />
                <span>{guest.phone}</span>
              </div>
            </div>
            <Pencil size={15} className="text-gray-300 shrink-0" />
          </div>
        ))}
        {(data?.count ?? 0) > guests.length && (
          <p className="text-center text-sm text-gray-400 py-2">Показано {guests.length} из {data?.count}</p>
        )}
      </div>

      {editGuest && (
        <GuestForm initial={editGuest} onClose={() => setEditGuest(null)} />
      )}
    </>
  )
}

// ─── Blacklist tab ────────────────────────────────────────────────────────────
function BlacklistTab({ search }: { search: string }) {
  const qc = useQueryClient()
  const [viewKey, setViewKey] = useState<string | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['blacklist', search],
    queryFn: () => blacklistApi.list(search || undefined),
  })
  const entries = data?.results ?? []

  const { mutate: deactivate } = useMutation({
    mutationFn: blacklistApi.deactivate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blacklist'] }),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (entries.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
        <ShieldOff size={28} className="text-emerald-500" />
      </div>
      <p className="font-semibold text-gray-600">Нарушений нет</p>
      <p className="text-sm mt-1">Нет гостей с нарушениями</p>
    </div>
  )

  // Группируем нарушения по гостю (или по ФИО, если гость не привязан)
  const groups = new Map<string, BlacklistEntry[]>()
  entries.forEach(e => {
    const key = (e.guest_name ?? e.full_name) || '—'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  })
  const groupList = Array.from(groups.entries())
  const activeEntries = viewKey ? (groups.get(viewKey) ?? []) : []

  return (
    <div className="space-y-2">
      {groupList.map(([name, list]) => (
        <div key={name} onClick={() => setViewKey(name)}
          className="tap-card flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-card cursor-pointer border-l-[3px] border-red-500">
          <div className="w-11 h-11 bg-red-50 rounded-full flex items-center justify-center shrink-0">
            <ShieldAlert size={20} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{name}</p>
            <p className="text-xs text-gray-400">{list[0].phone || '—'}</p>
          </div>
          <span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-lg font-bold shrink-0 ring-1 ring-red-200">
            {list.length} наруш.
          </span>
        </div>
      ))}

      {viewKey && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setViewKey(null)}>
          <div className="absolute inset-0 bg-black/30 animate-fade-in" />
          <div className="relative bg-white rounded-t-[20px] shadow-sheet animate-slide-up max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert size={20} className="text-red-600 shrink-0" />
                <h3 className="font-bold text-lg truncate">{viewKey}</h3>
              </div>
              <button onClick={() => setViewKey(null)} className="p-1"><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-2.5 flex-1">
              <p className="text-xs text-gray-400">{activeEntries.length} наруш.</p>
              {activeEntries.map(entry => (
                <div key={entry.id} className="bg-red-50/50 border border-red-100 rounded-xl px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-lg font-semibold ring-1 ring-red-200">
                      {entry.reason_display}
                    </span>
                    <span className="text-xs text-gray-400">{entry.created_at.slice(0, 10)}</span>
                  </div>
                  {entry.description && <p className="text-sm text-gray-600 mt-2">{entry.description}</p>}
                  {entry.reported_by_name && <p className="text-xs text-gray-400 mt-1.5">Добавил: {entry.reported_by_name}</p>}
                  <button
                    onClick={() => { if (confirm('Убрать это нарушение?')) { deactivate(entry.id); if (activeEntries.length <= 1) setViewKey(null) } }}
                    className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600">
                    <ShieldOff size={13} /> Убрать
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GuestsPage() {
  const [tab, setTab] = useState<'guests' | 'blacklist'>('guests')
  const [search, setSearch] = useState('')
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [showBlacklistForm, setShowBlacklistForm] = useState(false)

  const { data: blData } = useQuery({
    queryKey: ['blacklist', ''],
    queryFn: () => blacklistApi.list(),
  })
  const blacklistCount = blData?.count ?? 0

  return (
    <div className="px-4 py-4 space-y-3">
      <PageHeader
        title="Гости"
        action="Добавить"
        actionIcon={Plus}
        actionVariant={tab === 'blacklist' ? 'danger' : 'primary'}
        onAction={() => tab === 'guests' ? setShowGuestForm(true) : setShowBlacklistForm(true)}
      />

      <SegmentControl
        value={tab}
        onChange={v => { setTab(v as any); setSearch('') }}
        options={[
          { value: 'guests', label: 'Все гости' },
          { value: 'blacklist', label: `Нарушения${blacklistCount > 0 ? ` (${blacklistCount})` : ''}` },
        ]}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={tab === 'blacklist' ? 'Поиск в нарушениях...' : 'Имя или телефон...'}
      />

      {tab === 'guests' ? <GuestsList search={search} /> : <BlacklistTab search={search} />}

      {showGuestForm && <GuestForm onClose={() => setShowGuestForm(false)} />}
      {showBlacklistForm && <BlacklistForm onClose={() => setShowBlacklistForm(false)} />}
    </div>
  )
}
