import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../../api'
import type { Notification, NotificationType } from '../../types'
import { Bell, BellOff, AlertTriangle, Clock, CreditCard, Info, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  debt:     { icon: CreditCard,    color: 'text-red-600',    bg: 'bg-red-50' },
  expiring: { icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50' },
  overdue:  { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
  info:     { icon: Info,          color: 'text-blue-600',   bg: 'bg-blue-50' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'только что'
  if (m < 60) return `${m} мин назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч назад`
  return `${Math.floor(h / 24)} дн назад`
}

function NotifCard({ n, onRead }: { n: Notification; onRead: (id: number) => void }) {
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info
  const Icon = cfg.icon

  return (
    <div
      onClick={() => !n.is_read && onRead(n.id)}
      className={`flex gap-3 p-4 rounded-2xl border transition cursor-pointer ${
        n.is_read ? 'bg-white border-gray-100' : 'bg-white border-primary-100 shadow-card'
      }`}>
      <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon size={18} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-snug ${n.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
            {n.title}
          </p>
          {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 30000,
  })

  const { mutate: markRead } = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const { mutate: markAll, isPending: markingAll } = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Скрываем уведомления о выездах (expiring, overdue) — они дублируют дашборд и шумят
  const notifications = (data?.results ?? []).filter(n => n.type !== 'expiring' && n.type !== 'overdue')
  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Уведомления</h1>
          {unread > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{unread} непрочитанных</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={() => markAll()}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-xl">
              <CheckCheck size={14} />
              Прочитать все
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <BellOff size={28} className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-600">Нет уведомлений</p>
          <p className="text-sm text-gray-400 mt-1">Всё в порядке</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <NotifCard key={n.id} n={n} onRead={id => markRead(id)} />
          ))}
        </div>
      )}
    </div>
  )
}
