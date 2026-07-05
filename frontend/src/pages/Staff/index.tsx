import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../../api'
import { Plus, X, User as UserIcon, Shield, Headphones, Lock, Trash2 } from 'lucide-react'
import type { User, UserCreate, UserRole } from '../../types'
import { Avatar, PageHeader, EmptyState } from '../../components/ui'
import { formatPhoneKZ, PHONE_PLACEHOLDER } from '../../lib/phone'
import { useAuthStore } from '../../store/auth'

// Роли, которые владелец может выдать сотруднику.
// «Администратор» (manager) назначить может только владелец — сам
// администратор администратора создать не может (см. apps/users/serializers.py).
const ROLE_OPTIONS: { value: UserRole; label: string; hint: string; Icon: typeof Shield }[] = [
  { value: 'manager',   label: 'Администратор', hint: 'Заезды, гости, брони, сотрудники — без финансов', Icon: Shield },
  { value: 'reception', label: 'Ресепшн',       hint: 'Заселение, выселение, брони, гости',              Icon: Headphones },
]

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Суперадмин', owner: 'Владелец', manager: 'Администратор',
  reception: 'Ресепшн', housekeeping: 'Хозслужба', maintenance: 'Техник', accountant: 'Бухгалтер',
}

const ROLE_STYLE: Record<string, string> = {
  owner: 'bg-primary-50 text-primary-700 ring-primary-100',
  manager: 'bg-violet-50 text-violet-700 ring-violet-100',
  reception: 'bg-sky-50 text-sky-700 ring-sky-100',
}

// ── Форма добавления сотрудника ──
function StaffForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const me = useAuthStore(s => s.user)
  const isOwnerTier = me?.role === 'owner' || me?.role === 'superadmin'
  // Администратора (manager) может назначить только владелец — сам
  // администратор эту опцию даже не видит в форме.
  const roleOptions = isOwnerTier ? ROLE_OPTIONS : ROLE_OPTIONS.filter(o => o.value !== 'manager')
  const [form, setForm] = useState<UserCreate>({
    username: '', password: '', first_name: '', last_name: '', phone: '', role: 'reception',
  })
  const [error, setError] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: (data: UserCreate) => usersApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); onClose() },
    onError: (e: any) => {
      const d = e?.response?.data
      const msg = d?.username?.[0] ?? d?.password?.[0] ?? d?.detail ?? 'Ошибка при создании'
      setError(msg)
    },
  })

  const set = (k: keyof UserCreate, v: string) => setForm(f => ({ ...f, [k]: v }))
  const canSubmit = form.username && form.password.length >= 6 && form.first_name && !isPending

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] shadow-sheet animate-slide-up max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-lg">Добавить сотрудника</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
          {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2">{error}</div>}

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Роль *</label>
            <div className="grid grid-cols-2 gap-2">
              {roleOptions.map(({ value, label, hint, Icon }) => (
                <button key={value} type="button" onClick={() => set('role', value)}
                  className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition tap-card ${
                    form.role === value ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-700 border-gray-200'
                  }`}>
                  <div className="flex items-center gap-1.5">
                    <Icon size={15} className={form.role === value ? 'text-white' : 'text-gray-400'} />
                    <span className="text-sm font-semibold">{label}</span>
                  </div>
                  <span className={`text-[11px] leading-snug ${form.role === value ? 'text-white/80' : 'text-gray-400'}`}>{hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input className="input-field" placeholder="Имя *" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            <input className="input-field" placeholder="Фамилия" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          </div>
          <input className="input-field" placeholder={PHONE_PLACEHOLDER} type="tel" value={form.phone ?? ''} onChange={e => set('phone', formatPhoneKZ(e.target.value))} />

          <div className="pt-1 border-t border-gray-100" />
          <p className="text-xs font-semibold text-gray-500 uppercase">Данные для входа</p>
          <input className="input-field" placeholder="Логин *" autoCapitalize="none" value={form.username} onChange={e => set('username', e.target.value.trim())} />
          <input className="input-field" placeholder="Пароль * (мин. 6 символов)" value={form.password} onChange={e => set('password', e.target.value)} />
          <p className="text-xs text-gray-400 -mt-1">Передайте логин и пароль сотруднику — он войдёт под ними.</p>
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-gray-100">
          <button onClick={() => mutate(form)} disabled={!canSubmit}
            className="w-full bg-primary-500 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 transition tap-card">
            {isPending ? 'Создаём...' : 'Добавить сотрудника'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Страница ──
export default function StaffPage() {
  const me = useAuthStore(s => s.user)
  const canManage = me?.role === 'owner' || me?.role === 'superadmin' || me?.role === 'manager'
  const [showForm, setShowForm] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => usersApi.list(),
    enabled: canManage,
  })
  const staff = data?.results ?? []

  const { mutate: remove } = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })

  if (!canManage) return (
    <div className="px-4 py-20 text-center text-gray-400">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <Lock size={28} className="text-gray-400" />
      </div>
      <p className="font-semibold text-gray-600">Раздел недоступен</p>
      <p className="text-sm mt-1">Сотрудниками управляет владелец или администратор</p>
    </div>
  )

  return (
    <div className="px-4 py-4 space-y-3">
      <PageHeader title="Сотрудники" action="Добавить" actionIcon={Plus} onAction={() => setShowForm(true)} />

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <EmptyState icon={UserIcon} title="Сотрудников пока нет" />
      ) : (
        <div className="space-y-2">
          {staff.map((u: User) => {
            const isSelf = u.id === me?.id
            const canDelete = !isSelf && u.role !== 'owner' && u.role !== 'superadmin'
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-card">
                <Avatar name={`${u.first_name} ${u.last_name}`.trim() || u.username} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-gray-900 truncate">
                    {`${u.first_name} ${u.last_name}`.trim() || u.username}
                    {isSelf && <span className="text-xs text-gray-400 font-normal"> · вы</span>}
                  </p>
                  <p className="text-xs text-gray-400">@{u.username}{u.phone ? ` · ${u.phone}` : ''}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ring-1 shrink-0 ${ROLE_STYLE[u.role] ?? 'bg-gray-50 text-gray-600 ring-gray-100'}`}>
                  {u.role_display ?? ROLE_LABEL[u.role] ?? u.role}
                </span>
                {canDelete && (
                  <button onClick={() => { if (confirm(`Удалить сотрудника «${u.first_name || u.username}»?`)) remove(u.id) }}
                    className="p-1.5 text-gray-300 hover:text-red-500 shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && <StaffForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
