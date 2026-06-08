import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '../../api'
import { Plus, Phone, X, Calendar, UserCheck, UserX } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import type { LeadStatus } from '../../types'
import { format } from 'date-fns'
import { PageHeader, EmptyState } from '../../components/ui'

function NewLeadForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => leadsApi.create({ name, phone, notes, status: 'new' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up">
        <div className="flex justify-center mb-3">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Новый лид</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <input className="input-field" placeholder="Имя *" value={name} onChange={e => setName(e.target.value)} />
          <input className="input-field" placeholder="Телефон *" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <textarea className="input-field resize-none" placeholder="Заметки" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <button onClick={() => mutate()}
          disabled={!name || !phone || isPending}
          className="w-full mt-4 bg-primary-500 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 transition tap-card">
          {isPending ? 'Сохраняем...' : 'Добавить'}
        </button>
      </div>
    </div>
  )
}

function ScheduleViewingForm({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [datetime, setDatetime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))

  const { mutate, isPending } = useMutation({
    mutationFn: () => leadsApi.scheduleViewing(leadId, datetime + ':00'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up">
        <div className="flex justify-center mb-3">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Записать на показ</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-gray-400" /></button>
        </div>
        <input type="datetime-local" className="input-field mb-4" value={datetime} onChange={e => setDatetime(e.target.value)} />
        <button onClick={() => mutate()} disabled={isPending}
          className="w-full bg-primary-500 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 transition tap-card">
          {isPending ? 'Записываем...' : 'Записать'}
        </button>
      </div>
    </div>
  )
}

const statusOrder: LeadStatus[] = ['new', 'viewing_scheduled', 'viewed', 'negotiating', 'won', 'lost']

export default function LeadsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [viewingLeadId, setViewingLeadId] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')

  const { data, isLoading } = useQuery({ queryKey: ['leads'], queryFn: leadsApi.list })

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: LeadStatus }) => leadsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  const leads = data?.results ?? []
  const filtered = filterStatus === 'all' ? leads : leads.filter(l => l.status === filterStatus)

  const statusCounts = statusOrder.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length; return acc
  }, {} as Record<LeadStatus, number>)

  const statusLabels: Record<LeadStatus, string> = {
    new: 'Новые', viewing_scheduled: 'Показ', viewed: 'Осмотрел',
    negotiating: 'Торг', won: 'Заехал', lost: 'Отказ',
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <PageHeader title="Лиды" subtitle={`${leads.length} всего`} action="Добавить" actionIcon={Plus}
        onAction={() => setShowForm(true)} />

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <button onClick={() => setFilterStatus('all')}
          className={`shrink-0 px-3.5 py-2 rounded-full text-[13px] font-semibold transition ${
            filterStatus === 'all' ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500'
          }`}>
          Все ({leads.length})
        </button>
        {statusOrder.filter(s => s !== 'lost').map(s => {
          if (!statusCounts[s]) return null
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-[13px] font-semibold transition ${
                filterStatus === s ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500'
              }`}>
              {statusLabels[s]} ({statusCounts[s]})
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Phone} title="Нет лидов" subtitle="Добавьте первого" />
      ) : (
        <div className="space-y-2.5">
          {filtered.map(lead => (
            <div key={lead.id} className="bg-white rounded-2xl shadow-card px-4 py-3.5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900 text-[15px]">{lead.name}</p>
                  <div className="flex items-center gap-1 text-[13px] text-gray-500 mt-0.5">
                    <Phone size={12} />
                    <span>{lead.phone}</span>
                  </div>
                </div>
                <StatusBadge type="lead" status={lead.status} />
              </div>

              {lead.notes && (
                <p className="text-xs text-gray-500 mb-2.5 bg-gray-50 rounded-xl px-3 py-2">{lead.notes}</p>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-1">
                {lead.status === 'new' && (
                  <button onClick={() => setViewingLeadId(lead.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-2 rounded-xl ring-1 ring-primary-100 tap-card">
                    <Calendar size={13} /> Записать на показ
                  </button>
                )}
                {lead.status === 'viewing_scheduled' && (
                  <button onClick={() => updateStatus({ id: lead.id, status: 'viewed' })}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-2 rounded-xl ring-1 ring-violet-100 tap-card">
                    <UserCheck size={13} /> Осмотрел
                  </button>
                )}
                {(lead.status === 'viewed' || lead.status === 'negotiating') && (
                  <>
                    <button onClick={() => updateStatus({ id: lead.id, status: 'won' })}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl ring-1 ring-emerald-100 tap-card">
                      <UserCheck size={13} /> Заехал
                    </button>
                    <button onClick={() => updateStatus({ id: lead.id, status: 'lost' })}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 px-3 py-2 rounded-xl ring-1 ring-red-100 tap-card">
                      <UserX size={13} /> Отказ
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <NewLeadForm onClose={() => setShowForm(false)} />}
      {viewingLeadId !== null && <ScheduleViewingForm leadId={viewingLeadId} onClose={() => setViewingLeadId(null)} />}
    </div>
  )
}
