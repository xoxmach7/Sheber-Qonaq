import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

interface OrgInfo { trial_ends_at: string | null }

const fetchOrg = () => api.get<OrgInfo>('/organizations/me/').then(r => r.data)

export default function TrialBanner() {
  const { data } = useQuery({ queryKey: ['organization-me'], queryFn: fetchOrg })

  if (!data?.trial_ends_at) return null

  const daysLeft = Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / 86_400_000)

  if (daysLeft > 0) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center font-medium">
        Осталось {daysLeft} {daysLeft === 1 ? 'день' : 'дней'} бесплатного периода
      </div>
    )
  }

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 text-center font-medium">
      Пробный период закончился. Доступ только для просмотра. Свяжитесь с нами для подключения подписки.
    </div>
  )
}
