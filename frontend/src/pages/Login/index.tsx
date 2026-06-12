import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { Building2 } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const isLoading = useAuthStore(s => s.isLoading)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch {
      setError('Неверный логин или пароль')
    }
  }

  return (
    <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #EEF2FF 0%, #fff 50%, #EEF2FF 100%)' }}>

      {/* Logo */}
      <div className="text-center mb-10">
        <div className="w-[72px] h-[72px] rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
          <Building2 size={36} className="text-white" />
        </div>
        <h1 className="text-[28px] font-extrabold text-gray-900">Sheber Qonaq</h1>
        <p className="text-[15px] text-gray-500 mt-1">Управление хостелом</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-[320px]">
        <div className="mb-3.5">
          <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
            Логин <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="input-field"
            placeholder="admin"
          />
        </div>

        <div className="mb-3.5">
          <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
            Пароль <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="input-field"
            placeholder="••••••"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-3.5 py-2.5 rounded-xl text-[13px] font-medium mb-3.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-semibold py-3.5 rounded-xl transition-colors text-[15px] shadow-sm"
        >
          {isLoading ? 'Вход...' : 'Войти'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">Демо: admin / admin</p>
      </form>
    </div>
  )
}
