import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, AlertTriangle } from 'lucide-react'
import api from '../../api/client'

interface SignupPayload {
  email: string; password: string; org_name: string; city: string; booking_mode: 'hostel' | 'cottage'
}

const signupApi = (payload: SignupPayload) =>
  api.post('/organizations/signup/', payload).then(r => ({ ...r.data, __status: r.status }))

const resendApi = (email: string) =>
  api.post('/organizations/signup/resend/', { email }).then(r => r.data)

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [city, setCity] = useState('Алматы')
  const [bookingMode, setBookingMode] = useState<'hostel' | 'cottage'>('hostel')

  const mutation = useMutation({ mutationFn: signupApi })
  const resendMutation = useMutation({ mutationFn: resendApi })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ email, password, org_name: orgName, city, booking_mode: bookingMode })
  }

  // 202 — заявка сохранена, но письмо отправить не удалось (сервис временно недоступен).
  const emailFailedToSend = mutation.isSuccess && (mutation.data as any)?.__status === 202
  const confirmUrl = (mutation.data as any)?.confirm_url as string | undefined
  const resendConfirmUrl = (resendMutation.data as any)?.confirm_url as string | undefined

  if (mutation.isSuccess && !emailFailedToSend) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 shadow-card p-6 text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <Check size={28} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Проверьте почту</h2>
          <p className="text-sm text-gray-500">
            Мы отправили ссылку для подтверждения на {email}. Перейдите по ней, чтобы завершить регистрацию.
          </p>
        </div>
      </div>
    )
  }

  if (emailFailedToSend) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 shadow-card p-6 text-center space-y-3">
          <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={28} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Заявка сохранена</h2>
          <p className="text-sm text-gray-500">
            Но письмо на {email} отправить не удалось.
          </p>
          {(resendConfirmUrl || confirmUrl) && (
            <a
              href={resendConfirmUrl || confirmUrl}
              className="block w-full py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold text-center"
            >
              Подтвердить регистрацию
            </a>
          )}
          <button
            onClick={() => resendMutation.mutate(email)}
            disabled={resendMutation.isPending}
            className="w-full py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            {resendMutation.isPending ? 'Отправляем...' : 'Отправить письмо ещё раз'}
          </button>
          {resendMutation.isSuccess && !resendConfirmUrl && (
            <p className="text-xs text-emerald-600">Письмо отправлено повторно.</p>
          )}
        </div>
      </div>
    )
  }

  const duplicateEmailError = (mutation.error as any)?.response?.data?.email?.[0]
  const isDuplicateEmail = typeof duplicateEmailError === 'string' && duplicateEmailError.includes('уже отправлена')

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-3">
        <h1 className="text-xl font-extrabold text-gray-900">Регистрация</h1>
        <p className="text-sm text-gray-400">Бесплатно на 30 дней, без карты</p>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email *</label>
          <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Пароль *</label>
          <input type="password" required minLength={8} className="input-field" placeholder="Минимум 8 символов"
            value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Название объекта *</label>
          <input required className="input-field" placeholder="Дом на Абая" value={orgName} onChange={e => setOrgName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Город</label>
          <input className="input-field" value={city} onChange={e => setCity(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setBookingMode('hostel')}
            className={`py-2.5 rounded-xl border-2 text-sm font-semibold ${bookingMode === 'hostel' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-500'}`}>
            Хостел / Отель
          </button>
          <button type="button" onClick={() => setBookingMode('cottage')}
            className={`py-2.5 rounded-xl border-2 text-sm font-semibold ${bookingMode === 'cottage' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500'}`}>
            Гостевой дом
          </button>
        </div>

        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600 space-y-2">
            <p>{duplicateEmailError || 'Ошибка. Проверьте данные.'}</p>
            {isDuplicateEmail && (
              <button
                type="button"
                onClick={() => resendMutation.mutate(email)}
                disabled={resendMutation.isPending}
                className="text-sm font-semibold text-primary-600 underline disabled:opacity-40"
              >
                {resendMutation.isPending ? 'Отправляем...' : 'Отправить письмо ещё раз'}
              </button>
            )}
            {resendMutation.isSuccess && !resendConfirmUrl && (
              <p className="text-xs text-emerald-600">Письмо отправлено повторно — проверьте почту.</p>
            )}
            {resendConfirmUrl && (
              <a href={resendConfirmUrl} className="block text-sm font-semibold text-primary-600 underline">
                Подтвердить регистрацию
              </a>
            )}
          </div>
        )}

        <button type="submit" disabled={mutation.isPending}
          className="w-full py-3 bg-primary-500 text-white rounded-2xl text-sm font-semibold disabled:opacity-40">
          {mutation.isPending ? 'Отправляем...' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  )
}
