import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Building2, BedDouble, User, ChevronRight, ChevronLeft, Plus, X, Check, Copy } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/auth'

interface RoomInput { name: string }

interface OnboardingPayload {
  org_name: string; city: string; address: string; plan: string
  rooms: RoomInput[]
  manager_first_name: string; manager_last_name: string
  manager_username: string; manager_password: string; manager_phone: string
}

interface OnboardingResult {
  organization_id: number; property_id: number
  unit_count: number; manager_username: string; manager_id: number
}

const onboardingApi = (payload: OnboardingPayload) =>
  api.post<OnboardingResult>('/organizations/onboarding/', payload).then(r => r.data)

const STEPS = ['Объект', 'Комнаты', 'Менеджер']

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
            i < current ? 'bg-emerald-500 text-white' :
            i === current ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          <span className={`text-xs font-medium ${i === current ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px ${i < current ? 'bg-emerald-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  // ALL hooks first — before any conditional return
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<OnboardingResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [city, setCity] = useState('Алматы')
  const [address, setAddress] = useState('')
  const [plan, setPlan] = useState('free')
  const [rooms, setRooms] = useState<RoomInput[]>([{ name: 'Комната 1' }])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  const mutation = useMutation({
    mutationFn: onboardingApi,
    onSuccess: (data) => setResult(data),
  })

  // Guard AFTER all hooks
  if (user?.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Доступ только для SuperAdmin
      </div>
    )
  }

  const addRoom = () => setRooms(r => [...r, { name: `Комната ${r.length + 1}` }])
  const removeRoom = (i: number) => setRooms(r => r.filter((_, idx) => idx !== i))
  const updateRoom = (i: number, name: string) =>
    setRooms(r => r.map((room, idx) => idx === i ? { name } : room))

  const handleSubmit = () => {
    mutation.mutate({
      org_name: orgName, city, address, plan, rooms,
      manager_first_name: firstName, manager_last_name: lastName,
      manager_username: username, manager_password: password, manager_phone: phone,
    })
  }

  const copyCredentials = () => {
    navigator.clipboard.writeText(`Логин: ${result?.manager_username}\nПароль: ${password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (result) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
          <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={28} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Клиент создан!</h2>
          <p className="text-sm text-gray-500 mt-1">{orgName} — {result.unit_count} комнат</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Данные для входа</p>
          <div className="bg-gray-50 rounded-xl p-3 font-mono text-sm space-y-1">
            <p><span className="text-gray-400">Логин:</span> <span className="text-gray-900 font-bold">{result.manager_username}</span></p>
            <p><span className="text-gray-400">Пароль:</span> <span className="text-gray-900 font-bold">{password}</span></p>
          </div>
          <button onClick={copyCredentials}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Скопировано!' : 'Скопировать данные'}
          </button>
        </div>
        <button onClick={() => navigate('/dashboard')}
          className="w-full py-3 bg-gray-900 text-white rounded-2xl text-sm font-semibold">
          На дашборд
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-gray-900">Новый клиент</h1>
        <p className="text-sm text-gray-400 mt-0.5">Заполни данные — всё создастся автоматически</p>
      </div>
      <StepBar current={step} />

      {step === 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Building2 size={18} className="text-primary-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Объект размещения</h2>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Название *</label>
            <input className="input-field" placeholder="Дом на Абая" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Город</label>
            <input className="input-field" value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Адрес</label>
            <input className="input-field" placeholder="ул. Абая 10" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Тарифный план</label>
            <select className="input-field" value={plan} onChange={e => setPlan(e.target.value)}>
              <option value="free">Бесплатный</option>
              <option value="basic">Базовый</option>
              <option value="pro">Профессиональный</option>
            </select>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <BedDouble size={18} className="text-blue-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Комнаты / места</h2>
          </div>
          <div className="space-y-2">
            {rooms.map((room, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className="input-field flex-1" value={room.name}
                  onChange={e => updateRoom(i, e.target.value)} placeholder={`Комната ${i + 1}`} />
                {rooms.length > 1 && (
                  <button onClick={() => removeRoom(i)}
                    className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <X size={16} className="text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addRoom}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 font-medium">
            <Plus size={16} /> Добавить комнату
          </button>
          <p className="text-xs text-gray-400 text-center">{rooms.length} комнат добавлено</p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <User size={18} className="text-amber-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Аккаунт менеджера</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Имя *</label>
              <input className="input-field" placeholder="Айгуль" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Фамилия</label>
              <input className="input-field" placeholder="Сейткали" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Логин *</label>
            <input className="input-field" placeholder="aigul_hostel" value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Пароль *</label>
            <input className="input-field" type="password" placeholder="Минимум 8 символов"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Телефон</label>
            <input className="input-field" placeholder="+7 777 000 00 00" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
              {(mutation.error as any)?.response?.data?.manager_username?.[0] || 'Ошибка. Проверьте данные.'}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-6">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1.5 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl text-sm font-semibold">
            <ChevronLeft size={16} /> Назад
          </button>
        )}
        {step < 2 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !orgName.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-primary-500 text-white rounded-2xl text-sm font-semibold disabled:opacity-40">
            Далее <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!firstName || !username || !password || mutation.isPending}
            className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl text-sm font-semibold disabled:opacity-40">
            {mutation.isPending ? 'Создаём...' : 'Создать клиента'}
          </button>
        )}
      </div>
    </div>
  )
}
