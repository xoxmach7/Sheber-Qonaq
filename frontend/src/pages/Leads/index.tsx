import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '../../api'
import { Plus, Phone, X, Calendar } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import type { LeadStatus } from '../../types'
import { format } from 'date-fns'

function NewLeadForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => leadsApi.create({ name, phone, notes, status: 'new' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Новый лид</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <input className="input-field" placeholder="Имя *" value={name} onChange={e => setName(e.target.value)} />
          <input className="input-field" placeholder="Телефон *" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <textarea className="input-field resize-none" placeholder="Заметки" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <button
          onClick={() => mutate()}
          disabled={!name || !phone || isPending}
          className="w-full mt-4 bg-primary-600 text-white py-3 rounded-xl font-semibold disabled:bg-gray-300"
        >
          {isPending ? 'Сохраняем...' : 'Добавить'}
        </button>
      </div>
    </div>
  )
}

function ScheduleViewingForm({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [datetime, setDatetime] = useState(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  )

  const { mutate, isPending } = useMutation({
    mutationFn: () => leadsApi.scheduleViewing(leadId, datetime + ':00'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Записать на показ</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>
        <input
          type="datetime-local"
          className="input-field mb-4"
          value={datetime}
          onChange={e => setDatetime(e.target.value)}
        />
        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:bg-gray-300"
        >
          {isPending ? 'Записываем...' : 'Записать'}
        </button>
      </div>
    </div>
  )
}

const statusOrder: LeadStatus[] = [
  'new', 'viewing_scheduled', 'viewed', 'negotiating', 'won', 'lost',
]

export default function LeadsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [viewingLeadId, setViewingLeadId] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: leadsApi.list,
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: LeadStatus }) =>
      leadsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  const leads = data?.results ?? []
  const filtered = filterStatus === 'all' ? leads : leads.filter(l => l.status === filterStatus)

  const statusCounts = statusOrder.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length
    return acc
  }, {} as Record<LeadStatus, number>)

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Лиды</h2>
        <button
          onClick={() => setShowForm(true)}
          className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center shadow"
        >
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <button
          onClick={() => setFilterStatus('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
            filterStatus === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          Все ({leads.length})
        </button>
        {statusOrder.filter(s => s !== 'lost').map(s => (
          statusCounts[s] > 0 && (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                filterStatus === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {statusCounts[s]}
            </button>
          )
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Нет лидов</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => (
            <div
              key={lead.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{lead.name}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Phone size={12} />
                    <span>{lead.phone}</span>
                  </div>
                </div>
                <StatusBadge type="lead" status={lead.status} />
              </div>

              {lead.notes && (
                <p className="text-xs text-gray-500 mb-2 bg-gray-50 rounded-lg px-2 py-1.5">
                  {lead.notes}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-2">
                {lead.status === 'new' && (
                  <button
                    onClick={() => setViewingLeadId(lead.id)}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg"
                  >
                    <Calendar size={12} /> Показ
                  </button>
                )}
                {lead.status === 'viewing_scheduled' && (
                  <button
                    onClick={() => updateStatus({ id: lead.id, status: 'viewed' })}
                    className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg"
                  >
                    Осмотрел ✓
                  </button>
                )}
                {(lead.status === 'viewed' || lead.status === 'negotiating') && (
                  <>
                    <button
                      onClick={() => updateStatus({ id: lead.id, status: 'won' })}
                      className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg"
                    >
                      Заехал ✓
                    </button>
                    <button
                      onClick={() => updateStatus({ id: lead.id, status: 'lost' })}
                      className="text-xs font-medium text-red-500 bg-red-50 px-3 py-1.5 rounded-lg"
                    >
                      Отказ
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <NewLeadForm onClose={() => setShowForm(false)} />}
      {viewingLeadId !== null && (
        <ScheduleViewingForm
          leadId={viewingLeadId}
          onClose={() => setViewingLeadId(null)}
        />
      )}
    </div>
  )
}
