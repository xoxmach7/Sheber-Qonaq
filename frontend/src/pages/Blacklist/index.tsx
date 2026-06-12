import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { blacklistApi } from '../../api'
import type { BlacklistCreate, BlacklistEntry, BlacklistReason } from '../../types'
import { ShieldAlert, Plus, X, Phone, User, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/ui'
import { useAuthStore } from '../../store/auth'

const REASONS: { value: BlacklistReason; label: string }[] = [
  { value: 'debt',       label: 'Долг / не заплатил' },
  { value: 'theft',      label: 'Кража' },
  { value: 'vandalism',  label: 'Вандализм' },
  { value: 'fraud',      label: 'Мошенничество' },
  { value: 'behavior',   label: 'Нарушение порядка' },
  { value: 'other',      label: 'Другое' },
]

const REASON_COLOR: Record<BlacklistReason, string> = {
  debt:      'bg-orange-50 text-orange-700 border-orange-200',
  theft:     'bg-red-50 text-red-700 border-red-200',
  vandalism: 'bg-red-50 text-red-700 border-red-200',
  fraud:     'bg-purple-50 text-purple-700 border-purple-200',
  behavior:  'bg-amber-50 text-amber-700 border-amber-200',
  other:     'bg-gray-50 text-gray-600 border-gray-200',
}

function AddSheet({ onClose, onSave }: { onClose: () => void; onSave: (d: BlacklistCreate) => void }) {
  const [form, setForm] = useState<BlacklistCreate>({
    full_name: '', phone: '', iin: '', reason: 'debt', description: '',
  })
  const set = (k: keyof BlacklistCreate, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div className="relative w-full bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-4"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Добавить в чёрный список</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">ФИО *</label>
            <input className="input-field" placeholder="Иванов Иван Иванович" value={form.full_name}
              onChange={e => set('full_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Телефон</label>
              <input className="input-field" placeholder="+7 700 000 00 00" value={form.phone ?? ''}
                onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">ИИН</label>
              <input className="input-field" placeholder="123456789012" value={form.iin ?? ''}
                onChange={e => set('iin', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Причина *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {REASONS.map(r => (
                <button key={r.value} type="button"
                  onClick={() => set('reason', r.value)}
                  className={`px-3 py-2 rounded-xl border text-xs font-medium text-left transition ${
                    form.reason === r.value ? 'bg-red-500 text-white border-red-500' : 'bg-white border-gray-200 text-gray-700'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Описание *</label>
            <textarea className="input-field resize-none" rows={3}
              placeholder="Что произошло? Даты, сумма долга или детали инцидента..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <button
            onClick={() => { if (form.full_name && form.description) onSave(form) }}
            disabled={!form.full_name || !form.description}
            className="w-full py-3 bg-red-500 text-white rounded-2xl text-sm font-bold disabled:opacity-40">
            Добавить в список
          </button>
        </div>
      </div>
    </div>
  )
}

function EntryCard({ entry, canDelete, onDelete }: {
  entry: BlacklistEntry; canDelete: boolean; onDelete: () => void
}) {
  const colorClass = REASON_COLOR[entry.reason] ?? REASON_COLOR.other
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{entry.full_name}</p>
            {entry.reported_by_name && (
              <p className="text-[11px] text-gray-400">добавил: {entry.reported_by_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {entry.is_verified && (
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 size={10} /> Подтверждено
            </div>
          )}
          {canDelete && (
            <button onClick={onDelete}
              className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <Trash2 size={13} className="text-red-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
          {entry.reason_display}
        </span>
        {entry.phone && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
            <Phone size={9} /> {entry.phone}
          </span>
        )}
        {entry.iin && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
            <User size={9} /> ИИН: {entry.iin}
          </span>
        )}
      </div>

      {entry.description && (
        <p className="text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2">{entry.description}</p>
      )}
    </div>
  )
}

export default function BlacklistPage() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['blacklist'],
    queryFn: () => blacklistApi.list(),
  })

  const { mutate: addEntry } = useMutation({
    mutationFn: (d: BlacklistCreate) => blacklistApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blacklist'] }); setShowAdd(false) },
  })

  const { mutate: removeEntry } = useMutation({
    mutationFn: (id: number) => blacklistApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blacklist'] }),
  })

  const entries = (data?.results ?? []).filter(e =>
    !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.phone?.includes(search)
  )

  const orgId = user?.organization

  return (
    <div className="px-4 py-4 space-y-3">
      <PageHeader title="Чёрный список" subtitle="Общий реестр — виден всем объектам" />

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
        <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          Список общий — все объекты платформы видят эти записи и получают предупреждение при заселении.
        </p>
      </div>

      <div className="flex gap-2">
        <input className="input-field flex-1 text-sm" placeholder="Поиск по имени или телефону..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={() => setShowAdd(true)}
          className="w-11 h-11 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <ShieldAlert size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">Список пуст</p>
          <p className="text-xs text-gray-400 mt-1">Добавьте проблемного гостя</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">{entries.length} записей</p>
          {entries.map(e => (
            <EntryCard key={e.id} entry={e}
              canDelete={e.reported_by === orgId}
              onDelete={() => removeEntry(e.id)} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddSheet onClose={() => setShowAdd(false)} onSave={addEntry} />
      )}
    </div>
  )
}
