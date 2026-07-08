import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Building2, BedDouble, User, ChevronRight, ChevronLeft, Plus, X, Check, Copy, Home } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/auth'
import { formatPhoneKZ, PHONE_PLACEHOLDER } from '../../lib/phone'

interface RoomInput { name: string; type?: 'dorm' | 'private' | 'family'; beds?: number }

interface OnboardingPayload {
  org_name: string; city: string; address: string; plan: string
  booking_mode: string
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
  const plan = 'free'
  const [bookingMode, setBookingMode] = useState<'hostel' | 'cottage'>('hostel')
  const [rooms, setRooms] = useState<RoomInput[]>([{ name: 'Комната 1', type: 'private', beds: 1 }])
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

  const addRoom = () => setRooms(r => [...r, { name: `Комната ${r.length + 1}`, type: 'private', beds: 1 }])
  const removeRoom = (i: number) => setRooms(r => r.filter((_, idx) => idx !== i))
  const updateRoom = (i: number, patch: Partial<RoomInput>) =>
    setRooms(r => r.map((room, idx) => idx === i ? { ...room, ...patch } : room))

  const handleSubmit = () => {
    mutation.mutate({
      org_name: orgName, city, address, plan, booking_mode: bookingMode, rooms,
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
          <p className="text-sm text-gray-500 mt-1">{orgName} — {result.unit_count} {bookingMode === 'cottage' ? 'объектов' : 'комнат'}</p>
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
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Тип объекта</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setBookingMode('hostel')
                  setRooms([{ name: 'Комната 1', type: 'private', beds: 1 }])
                }}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  bookingMode === 'hostel'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                <BedDouble size={22} />
                <span>Хостел / Отель</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBookingMode('cottage')
                  setRooms([{ name: 'Домик 1', type: 'private', beds: 1 }])
                }}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  bookingMode === 'cottage'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                <Home size={22} />
                <span>Гостевой дом / Баня</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bookingMode === 'cottage' ? 'bg-amber-50' : 'bg-blue-50'}`}>
              {bookingMode === 'cottage'
                ? <Home size={18} className="text-amber-600" />
                : <BedDouble size={18} className="text-blue-600" />}
            </div>
            <h2 className="text-base font-bold text-gray-900">
              {bookingMode === 'cottage' ? 'Домики / объекты' : 'Комнаты / места'}
            </h2>
          </div>
          <div className="space-y-2">
            {rooms.map((room, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-2.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input className="input-field flex-1" value={room.name}
                    onChange={e => updateRoom(i, { name: e.target.value })}
                    placeholder={bookingMode === 'cottage' ? `Домик ${i + 1}` : `Комната ${i + 1}`} />
                  {rooms.length > 1 && (
                    <button onClick={() => removeRoom(i)}
                      className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                      <X size={16} className="text-red-500" />
                    </button>
                  )}
                </div>

                {bookingMode === 'hostel' && (
                  <>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        ['dorm', 'Дорм с койками'],
                        ['private', 'Отдельная'],
                        ['family', 'Семейный'],
                      ] as const).map(([val, label]) => (
                        <button key={val} type="button"
                          onClick={() => updateRoom(i, { type: val, beds: val === 'dorm' ? (room.beds && room.beds > 1 ? room.beds : 4) : 1 })}
                          className={`py-2 px-1 rounded-lg border text-[11px] font-semibold leading-tight transition-all ${
                            (room.type ?? 'private') === val
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 bg-white text-gray-500'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {room.type === 'dorm' && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500 shrink-0">Койко-мест в комнате</label>
                        <input type="number" min={1} max={50} className="input-field w-20"
                          value={room.beds ?? 1}
                          onChange={e => updateRoom(i, { beds: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })} />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <button onClick={addRoom}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 font-medium">
            <Plus size={16} /> {bookingMode === 'cottage' ? 'Добавить домик' : 'Добавить комнату'}
          </button>
          <p className="text-xs text-gray-400 text-center">
            {bookingMode === 'cottage'
              ? `${rooms.length} объектов добавлено`
              : `${rooms.length} комнат · ${rooms.reduce((sum, r) => sum + (r.type === 'dorm' ? (r.beds ?? 1) : 1), 0)} мест`}
          </p>
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
            <input className="input-field" placeholder={PHONE_PLACEHOLDER} value={phone} onChange={e => setPhone(formatPhoneKZ(e.target.value))} />
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
