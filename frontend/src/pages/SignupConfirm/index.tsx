import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../api/client'

export default function SignupConfirmPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')

  useEffect(() => {
    if (!token) return
    api.post(`/organizations/signup/confirm/${token}/`)
      .then(r => {
        localStorage.setItem('access_token', r.data.access)
        localStorage.setItem('refresh_token', r.data.refresh)
        navigate('/dashboard')
      })
      .catch(() => setStatus('error'))
  }, [token, navigate])

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 shadow-card p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Ссылка недействительна</h2>
          <p className="text-sm text-gray-500">Возможно, она устарела или уже была использована.</p>
          <Link to="/signup" className="text-primary-600 text-sm font-semibold">Зарегистрироваться заново</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">Подтверждаем регистрацию...</p>
    </div>
  )
}
