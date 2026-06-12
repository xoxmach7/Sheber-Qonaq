import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi, staysApi, guestsApi, blacklistApi } from '../../api'
import type { Unit, UnitStatus, StayCreate, RateType, GuestCreate } from '../../types'
import {
  Wrench, Moon, CheckCircle2, Clock, Ban, Sparkles,
  Phone, CalendarDays, LogOut, Plus, X, Search,
  UserPlus, AlertTriangle, User,
} from 'lucide-react'
import { PageHeader, FilterPills, Avatar } from '../../components/ui'
import { format } from 'date-fns'

// ── Status config ──
const STATUS: Record<UnitStatus, { label: string; dot: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  available:    { label: 'Свободно',  dot: 'bg-emerald-400', bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 size={12} className="text-emerald-500" /> },
  occupied:     { label: 'Занято',    dot: 'bg-primary-500', bg: 'bg-primary-50',  text: 'text-primary-700', border: 'border-primary-200', icon: <Moon size={12} className="text-primary-500" /> },
  reserved:     { label: 'Бронь',     dot: 'bg-violet-400',  bg: 'bg-violet-50',   text: 'text-violet-700',  border: 'border-violet-200',  icon: <Clock size={12} className="text-violet-500" /> },
  dirty:        { label: 'Уборка',    dot: 'bg-amber-400',   bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   icon: <Sparkles size={12} className="text-amber-500" /> },
  maintenance:  { label: 'Ремонт',    dot: 'bg-orange-400',  bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200',  icon: <Wrench size={12} className="text-orange-500" /> },
  out_of_order: { label: 'Закрыто',   dot: 'bg-gray-400',    bg: 'bg-gray-100',    text: 'text-gray-500',    border: 'border-gray-200',    icon: <Ban size={12} className="text-gray-400" /> },
}

// ── Check-In Sheet (pre-selected unit) ──
function CheckInSheet({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    guest: '', guestName: '', guestPhone: '',
    check_in_date: format(new Date(), 'yyyy-MM-dd'),
    expected_check_out_date: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
    rate_type: 'monthly' as RateType,
    rate_amount: '',
  })
  const [guestSearch, setGuestSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [newGuest, setNewGuest] = useState<GuestCreate>({ first_name: '', last_name: '', phone: '', nationality: '', is_foreigner: false })

  const { data: guestResults } = useQuery({
    queryKey: ['guests-search', guestSearch],
    queryFn: () => guestsApi.list(guestSearch),
    enabled: guestSearch.length >= 2,
  })
  const { data: blCheck } = useQuery({
    queryKey: ['bl-check', form.guestPhone],
    queryFn: () => blacklistApi.check(form.guestPhone),
    enabled: form.guestPhone.length > 5,
  })
  const { mutate: createGuest, isPending: creatingGuest } = useMutation({
    mutationFn: (d: GuestCreate) => guestsApi.create(d),
    onSuccess: (g) => {
      setForm(f => ({ ...f, guest: String(g.id), guestName: g.full_name, guestPhone: g.phone }))
      setShowQuickCreate(false); setGuestSearch('')
      qc.invalidateQueries({ queryKey: ['guests-search'] })
    },
  })
  const { mutate: checkIn, isPending, error } = useMutation({
    mutationFn: (d: StayCreate) => staysApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const isBlacklisted = blCheck?.is_blacklisted ?? false
  const canSubmit = form.guest && form.check_in_date && form.expected_check_out_date && form.rate_amount && !isPending
  const rateLabels: Record<RateType, string> = { daily: 'Суточно', weekly: 'Понедельно', monthly: 'Помесячно' }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div className="relative w-full bg-white rounded-t-[20px] shadow-sheet animate-slide-up max-h-[94vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-bold text-lg">Заселить</h3>
            <p className="text-xs text-gray-400">{unit.room_name} — {unit.name}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{(error as any)?.response?.data?.non_field_errors?.[0] ?? 'Ошибка'}</div>}

          {isBlacklisted && (
            <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={15} className="text-red-600 shrink-0" />
                <span className="font-bold text-red-700 text-sm">Гость в чёрном списке!</span>
              </div>
              {blCheck?.entries.map(e => (
                <p key={e.id} className="text-xs text-red-600 ml-5">{e.reason_display}: {e.description.slice(0, 80)}</p>
              ))}
            </div>
          )}

          {/* Guest */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Гость *</label>
            {form.guest ? (
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isBlacklisted ? 'bg-red-50 border-red-300' : 'bg-primary-50 border-primary-200'}`}>
                <Avatar name={form.guestName} size={32} />
                <span className={`flex-1 font-medium text-sm ${isBlacklisted ? 'text-red-800' : 'text-primary-800'}`}>{form.guestName}</span>
                <button onClick={() => setForm(f => ({ ...f, guest: '', guestName: '', guestPhone: '' }))}><X size={16} className="text-gray-400" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input-field pl-9" placeholder="Имя или телефон..."
                  value={guestSearch}
                  onChange={e => { setGuestSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)} />
                {showDropdown && guestResults?.results && guestResults.results.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {guestResults.results.slice(0, 5).map(g => (
                      <button key={g.id} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0 flex items-center gap-3"
                        onMouseDown={() => { setForm(f => ({ ...f, guest: String(g.id), guestName: g.full_name, guestPhone: g.phone })); setGuestSearch(''); setShowDropdown(false) }}>
                        <Avatar name={g.full_name} size={28} />
                        <div><p className="text-sm font-medium text-gray-900">{g.full_name}</p><p className="text-xs text-gray-400">{g.phone}</p></div>
                        {g.is_blacklisted && <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">ЧС</span>}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && guestSearch.length >= 2 && guestResults?.results?.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-4 py-3 text-sm text-gray-500 border-b">Гость не найден</div>
                    <button onMouseDown={() => { setShowQuickCreate(true); setShowDropdown(false) }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-primary-600 text-sm font-medium">
                      <UserPlus size={15} /> Создать нового гостя
                    </button>
                  </div>
                )}
              </div>
            )}

            {showQuickCreate && !form.guest && (
              <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><User size={12} />Новый гость</p>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-field text-sm" placeholder="Имя *" value={newGuest.first_name} onChange={e => setNewGuest(g => ({ ...g, first_name: e.target.value }))} />
                  <input className="input-field text-sm" placeholder="Фамилия *" value={newGuest.last_name} onChange={e => setNewGuest(g => ({ ...g, last_name: e.target.value }))} />
                </div>
                <input className="input-field text-sm" placeholder="Телефон *" value={newGuest.phone} onChange={e => setNewGuest(g => ({ ...g, phone: e.target.value }))} />
                <button onClick={() => createGuest(newGuest)}
                  disabled={!newGuest.first_name || !newGuest.last_name || !newGuest.phone || creatingGuest}
                  className="w-full py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40">
                  {creatingGuest ? 'Создаём...' : 'Создать и выбрать'}
                </button>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Заезд *</label>
              <input type="date" className="input-field text-sm" value={form.check_in_date} onChange={e => setForm(f => ({ ...f, check_in_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Выезд</label>
              <input type="date" className="input-field text-sm" value={form.expected_check_out_date} onChange={e => setForm(f => ({ ...f, expected_check_out_date: e.target.value }))} />
            </div>
          </div>

          {/* Rate */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Тариф *</label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {(['monthly', 'weekly', 'daily'] as RateType[]).map(rt => (
                <button key={rt} onClick={() => setForm(f => ({ ...f, rate_type: rt }))}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${form.rate_type === rt ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {rateLabels[rt]}
                </button>
              ))}
            </div>
            <input type="number" className="input-field" placeholder="Сумма ₸" value={form.rate_amount}
              onChange={e => setForm(f => ({ ...f, rate_amount: e.target.value }))} />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={() => checkIn({ unit: unit.id, guest: Number(form.guest), check_in_date: form.check_in_date, expected_check_out_date: form.expected_check_out_date, rate_type: form.rate_type, rate_amount: form.rate_amount, deposit_amount: 0 })}
            disabled={!canSubmit}
            className="w-full py-3.5 bg-primary-500 text-white rounded-2xl text-sm font-bold disabled:opacity-40">
            {isPending ? 'Заселяем...' : 'Заселить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Free unit panel ──
function FreePanel({ unit, onCheckIn, onChangeStatus, onClose }: {
  unit: Unit; onCheckIn: () => void; onChangeStatus: () => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" />
      <div className="relative w-full bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-4">{unit.room_name} — {unit.name}</p>
        <div className="flex gap-2">
          <button onClick={onCheckIn}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary-500 text-white rounded-2xl text-sm font-bold">
            <Plus size={18} /> Заселить
          </button>
          <button onClick={onChangeStatus}
            className="px-5 py-3.5 bg-gray-100 text-gray-600 rounded-2xl text-sm font-semibold">
            Статус
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Occupied unit panel ──
function OccupiedPanel({ unit, onClose, onChangeStatus, onCheckout }: {
  unit: Unit; onClose: () => void; onChangeStatus: () => void; onCheckout: () => void
}) {
  const { data: blCheck } = useQuery({
    queryKey: ['bl-check', unit.current_guest_phone],
    queryFn: () => blacklistApi.check(unit.current_guest_phone!),
    enabled: !!unit.current_guest_phone && unit.current_guest_phone.length > 5,
  })
  const isBlacklisted = blCheck?.is_blacklisted ?? false

  const fmt = (d?: string) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}.${m}.${y}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" />
      <div className="relative w-full bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">{unit.room_name} — {unit.name}</p>

        {isBlacklisted && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-700 font-semibold">Гость в чёрном списке</p>
          </div>
        )}

        <div className="bg-primary-50 rounded-2xl p-4 mb-4">
          <p className="text-base font-bold text-gray-900">{unit.current_guest}</p>
          {unit.current_guest_phone && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Phone size={13} className="text-gray-400" />
              <span className="text-sm text-gray-600">{unit.current_guest_phone}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            <CalendarDays size={13} className="text-gray-400" />
            <span className="text-sm text-gray-600">{fmt(unit.check_in)} → {fmt(unit.check_out)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onCheckout}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-red-500 text-white rounded-2xl text-sm font-bold">
            <LogOut size={16} /> Выселить
          </button>
          <button onClick={onChangeStatus}
            className="px-5 py-3.5 bg-gray-100 text-gray-600 rounded-2xl text-sm font-semibold">
            Статус
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status Picker ──
function StatusPicker({ unit, onSelect, onClose }: { unit: Unit; onSelect: (s: UnitStatus) => void; onClose: () => void }) {
  const clickable: UnitStatus[] = ['available', 'dirty', 'maintenance', 'out_of_order']
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" />
      <div className="relative w-full bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">{unit.room_name} — {unit.name} — изменить статус</p>
        <div className="grid grid-cols-2 gap-2">
          {clickable.map(s => {
            const cfg = STATUS[s]
            const isCurrent = unit.status === s
            return (
              <button key={s} onClick={() => { onSelect(s); onClose() }} disabled={isCurrent}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-sm font-medium transition tap-card ${isCurrent ? `${cfg.bg} ${cfg.border} ${cfg.text} opacity-50` : 'bg-white border-gray-200 text-gray-700'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0`} />
                {cfg.label}
                {isCurrent && <span className="ml-auto text-xs opacity-60">сейчас</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Bed cell ──
function BedCell({ unit, position, onClick }: { unit: Unit; position: 'lower' | 'upper'; onClick: () => void }) {
  const cfg = STATUS[unit.status]
  const posLabel = position === 'lower' ? '↓ Нижн.' : '↑ Верхн.'
  const posColor = position === 'lower' ? 'text-gray-400' : 'text-primary-400'
  const shortName = unit.name.includes('-') ? unit.name.split('-')[1] : unit.name
  return (
    <button onClick={onClick}
      className={`relative flex flex-col w-full rounded-xl border p-2 text-left transition tap-card ${cfg.bg} ${cfg.border}`}
      style={{ minHeight: 72 }}>
      <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className={`text-[9px] font-semibold ${posColor} leading-none mb-1`}>{posLabel}</span>
      <span className={`text-xs font-bold ${cfg.text} leading-none`}>{shortName}</span>
      <div className="mt-1">{cfg.icon}</div>
      {unit.status === 'occupied' && unit.current_guest && (
        <p className="text-[9px] text-primary-600 font-medium mt-0.5 leading-tight truncate w-full">
          {unit.current_guest.split(' ')[0]}
        </p>
      )}
    </button>
  )
}

interface RoomGroup { roomId: number; roomName: string; units: Unit[] }
function groupByRoom(units: Unit[]): RoomGroup[] {
  const map = new Map<number, RoomGroup>()
  for (const u of units) {
    if (!map.has(u.room)) map.set(u.room, { roomId: u.room, roomName: u.room_name ?? `Комната ${u.room}`, units: [] })
    map.get(u.room)!.units.push(u)
  }
  return Array.from(map.values())
}

function Legend({ units }: { units: Unit[] }) {
  const counts = units.reduce((acc, u) => { acc[u.status] = (acc[u.status] ?? 0) + 1; return acc }, {} as Record<UnitStatus, number>)
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {(['occupied','available','reserved','dirty','maintenance','out_of_order'] as UnitStatus[]).map(s => {
        const n = counts[s] ?? 0
        if (!n) return null
        const cfg = STATUS[s]
        return (
          <div key={s} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
            <span className="text-xs text-gray-500">{cfg.label}</span>
            <span className={`text-xs font-bold ${cfg.text}`}>{n}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──
type PanelState = { type: 'free' | 'occupied' | 'status' | 'checkin'; unit: Unit } | null

export default function OccupancyPage() {
  const qc = useQueryClient()
  const [panel, setPanel] = useState<PanelState>(null)
  const [filter, setFilter] = useState('all')

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'], queryFn: propertiesApi.allUnits, staleTime: 30_000,
  })

  const { mutate: changeStatus } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: UnitStatus }) => propertiesApi.updateUnitStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  })

  const { mutate: checkout } = useMutation({
    mutationFn: (stayId: number) => staysApi.checkout(stayId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['units'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setPanel(null) },
  })

  const handleUnitClick = (unit: Unit) => {
    if (unit.status === 'occupied') setPanel({ type: 'occupied', unit })
    else setPanel({ type: 'free', unit })
  }

  const rooms = groupByRoom(units)
  const occupied = units.filter(u => u.status === 'occupied').length
  const available = units.filter(u => u.status === 'available').length
  const total = units.length
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0

  const counts: Record<string, number> = {
    all: total,
    available: units.filter(u => u.status === 'available').length,
    occupied: units.filter(u => u.status === 'occupied').length,
    maintenance: units.filter(u => u.status === 'maintenance' || u.status === 'dirty').length,
  }

  const filteredRooms = filter === 'all' ? rooms : rooms.map(r => ({
    ...r, units: r.units.filter(u => filter === 'maintenance' ? (u.status === 'maintenance' || u.status === 'dirty') : u.status === filter),
  })).filter(r => r.units.length > 0)

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-4 py-4 space-y-3">
      <PageHeader title="Карта размещения" subtitle={`${occupied} из ${total} мест занято`} />

      <FilterPills value={filter} onChange={setFilter} options={[
        { value: 'all', label: 'Все', count: counts.all },
        { value: 'available', label: 'Свободно', count: counts.available },
        { value: 'occupied', label: 'Занято', count: counts.occupied },
        { value: 'maintenance', label: 'Обслуж.', count: counts.maintenance },
      ]} />

      <div className="bg-white rounded-2xl shadow-card px-4 py-3">
        <div className="flex items-end justify-between mb-2">
          <div><span className="text-3xl font-extrabold text-gray-900">{pct}%</span><span className="text-sm text-gray-400 ml-1.5">заполнено</span></div>
          <span className="text-xs text-gray-500 text-right leading-relaxed">{occupied} занято<br />{available} своб.</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-2.5">
          <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <Legend units={units} />
      </div>

      {filteredRooms.map(room => {
        const isDorm = room.units.some(u => u.unit_type === 'bed')
        const roomOcc = room.units.filter(u => u.status === 'occupied').length
        const roomAvail = room.units.filter(u => u.status === 'available').length
        const bunks: Array<[Unit, Unit | undefined]> = []
        if (isDorm) for (let i = 0; i < room.units.length; i += 2) bunks.push([room.units[i], room.units[i + 1]])

        return (
          <div key={room.roomId} className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-gray-500">{room.roomName.match(/\d+/)?.[0] ?? '?'}</span>
                </div>
                <span className="font-semibold text-sm text-gray-800">{room.roomName}</span>
                {isDorm && <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">{Math.ceil(room.units.length / 2)} кровати</span>}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {roomOcc > 0 && <span className="flex items-center gap-1 text-primary-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-primary-400" />{roomOcc} зан.</span>}
                {roomAvail > 0 && <span className="flex items-center gap-1 text-emerald-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{roomAvail} св.</span>}
              </div>
            </div>

            {isDorm ? (
              <div className="p-3 grid grid-cols-3 gap-2">
                {bunks.map(([lower, upper], idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    {upper ? <BedCell unit={upper} position="upper" onClick={() => handleUnitClick(upper)} />
                      : <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50" style={{ minHeight: 72 }} />}
                    <BedCell unit={lower} position="lower" onClick={() => handleUnitClick(lower)} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 grid grid-cols-3 gap-2">
                {room.units.map(unit => {
                  const cfg = STATUS[unit.status]
                  const shortName = unit.name.includes('-') ? unit.name.split('-')[1] : unit.name
                  return (
                    <button key={unit.id} onClick={() => handleUnitClick(unit)}
                      className={`relative flex flex-col items-center justify-center rounded-xl border p-2 transition tap-card ${cfg.bg} ${cfg.border}`}
                      style={{ minHeight: 72 }}>
                      <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${cfg.dot}`} />
                      <p className={`text-xs font-bold ${cfg.text}`}>{shortName}</p>
                      <div className="mt-1">{cfg.icon}</div>
                      {unit.status === 'occupied' && unit.current_guest && (
                        <p className="text-[9px] text-primary-600 font-medium mt-1 text-center leading-tight truncate w-full px-1">
                          {unit.current_guest.split(' ')[0]}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {filteredRooms.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-base font-semibold text-gray-500">Нет мест</p>
          <p className="text-sm mt-1">Попробуйте другой фильтр</p>
        </div>
      )}

      {/* Panels */}
      {panel?.type === 'free' && (
        <FreePanel unit={panel.unit}
          onCheckIn={() => setPanel({ type: 'checkin', unit: panel.unit })}
          onChangeStatus={() => setPanel({ type: 'status', unit: panel.unit })}
          onClose={() => setPanel(null)} />
      )}
      {panel?.type === 'checkin' && (
        <CheckInSheet unit={panel.unit} onClose={() => setPanel(null)} />
      )}
      {panel?.type === 'occupied' && (
        <OccupiedPanel unit={panel.unit}
          onClose={() => setPanel(null)}
          onChangeStatus={() => setPanel({ type: 'status', unit: panel.unit })}
          onCheckout={() => { if (panel.unit.current_stay_id) checkout(panel.unit.current_stay_id) }} />
      )}
      {panel?.type === 'status' && (
        <StatusPicker unit={panel.unit}
          onSelect={(s) => changeStatus({ id: panel.unit.id, status: s })}
          onClose={() => setPanel(null)} />
      )}
    </div>
  )
}
