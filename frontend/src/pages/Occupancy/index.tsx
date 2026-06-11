import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { propertiesApi } from '../../api'
import type { Unit, UnitStatus } from '../../types'
import { Wrench, Moon, CheckCircle2, Clock, Ban, Sparkles, Phone, CalendarDays, ArrowRight } from 'lucide-react'
import { PageHeader, FilterPills } from '../../components/ui'

// ── Status config ──
interface StatusCfg {
  label: string
  dot: string
  bg: string
  text: string
  border: string
  icon: React.ReactNode
}

const STATUS: Record<UnitStatus, StatusCfg> = {
  available: {
    label: 'Свободно', dot: 'bg-emerald-400',
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
    icon: <CheckCircle2 size={12} className="text-emerald-500" />,
  },
  occupied: {
    label: 'Занято', dot: 'bg-primary-500',
    bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200',
    icon: <Moon size={12} className="text-primary-500" />,
  },
  reserved: {
    label: 'Бронь', dot: 'bg-violet-400',
    bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200',
    icon: <Clock size={12} className="text-violet-500" />,
  },
  dirty: {
    label: 'Уборка', dot: 'bg-amber-400',
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
    icon: <Sparkles size={12} className="text-amber-500" />,
  },
  maintenance: {
    label: 'Ремонт', dot: 'bg-orange-400',
    bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200',
    icon: <Wrench size={12} className="text-orange-500" />,
  },
  out_of_order: {
    label: 'Закрыто', dot: 'bg-gray-400',
    bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200',
    icon: <Ban size={12} className="text-gray-400" />,
  },
}

// ── Status picker sheet ──
function StatusPicker({ unit, onSelect, onClose }: {
  unit: Unit; onSelect: (s: UnitStatus) => void; onClose: () => void
}) {
  const clickable: UnitStatus[] = ['available', 'dirty', 'maintenance', 'out_of_order']
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" />
      <div className="relative w-full bg-white rounded-t-[20px] p-5 shadow-sheet animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
          {unit.name} — изменить статус
        </p>
        <div className="grid grid-cols-2 gap-2">
          {clickable.map(s => {
            const cfg = STATUS[s]
            const isCurrent = unit.status === s
            return (
              <button key={s}
                onClick={() => { onSelect(s); onClose() }}
                disabled={isCurrent}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-sm font-medium transition tap-card ${
                  isCurrent
                    ? `${cfg.bg} ${cfg.border} ${cfg.text} opacity-50 cursor-default`
                    : `bg-white border-gray-200 text-gray-700 hover:${cfg.bg}`
                }`}
              >
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

// ── Guest panel ──
function GuestPanel({ unit, onClose, onChangeStatus, navigate }: {
  unit: Unit; onClose: () => void
  onChangeStatus: () => void
  navigate: (path: string) => void
}) {
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
        <div className="flex justify-center mb-3">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">{unit.name}</p>

        <div className="bg-primary-50 rounded-2xl p-4 mb-3">
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
          {unit.current_stay_id && (
            <button
              onClick={() => { onClose(); navigate('/stays') }}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold"
            >
              Открыть заезд <ArrowRight size={16} />
            </button>
          )}
          <button
            onClick={() => { onClose(); onChangeStatus() }}
            className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold"
          >
            Статус
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bed cell ──
function BedCell({ unit, position, onClick }: {
  unit: Unit; position: 'lower' | 'upper'; onClick: () => void
}) {
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
          {unit.current_guest.split(' ').slice(0, 2).join(' ')}
        </p>
      )}
    </button>
  )
}

// ── Room grouping ──
interface RoomGroup { roomId: number; roomName: string; units: Unit[] }

function groupByRoom(units: Unit[]): RoomGroup[] {
  const map = new Map<number, RoomGroup>()
  for (const u of units) {
    if (!map.has(u.room)) {
      map.set(u.room, { roomId: u.room, roomName: u.room_name ?? `Комната ${u.room}`, units: [] })
    }
    map.get(u.room)!.units.push(u)
  }
  return Array.from(map.values())
}

// ── Legend ──
function Legend({ units }: { units: Unit[] }) {
  const counts = units.reduce((acc, u) => {
    acc[u.status] = (acc[u.status] ?? 0) + 1; return acc
  }, {} as Record<UnitStatus, number>)
  const order: UnitStatus[] = ['occupied', 'available', 'reserved', 'dirty', 'maintenance', 'out_of_order']
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {order.map(s => {
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
export default function OccupancyPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [picker, setPicker] = useState<Unit | null>(null)
  const [guestPanel, setGuestPanel] = useState<Unit | null>(null)
  const [filter, setFilter] = useState('all')

  const handleUnitClick = (unit: Unit) => {
    if (unit.status === 'occupied') setGuestPanel(unit)
    else setPicker(unit)
  }

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: propertiesApi.allUnits,
    staleTime: 30_000,
  })

  const { mutate: changeStatus } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: UnitStatus }) =>
      propertiesApi.updateUnitStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  })

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

  // Filter rooms/units
  const filteredRooms = filter === 'all'
    ? rooms
    : rooms.map(r => ({
        ...r,
        units: r.units.filter(u =>
          filter === 'maintenance' ? (u.status === 'maintenance' || u.status === 'dirty') : u.status === filter
        ),
      })).filter(r => r.units.length > 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <PageHeader title="Карта размещения" subtitle={`${occupied} из ${total} мест занято`} />

      <FilterPills value={filter} onChange={setFilter} options={[
        { value: 'all', label: 'Все', count: counts.all },
        { value: 'available', label: 'Свободно', count: counts.available },
        { value: 'occupied', label: 'Занято', count: counts.occupied },
        { value: 'maintenance', label: 'Обслуж.', count: counts.maintenance },
      ]} />

      {/* Occupancy bar */}
      <div className="bg-white rounded-2xl shadow-card px-4 py-3">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-3xl font-extrabold text-gray-900">{pct}%</span>
            <span className="text-sm text-gray-400 ml-1.5">заполнено</span>
          </div>
          <span className="text-xs text-gray-500 text-right leading-relaxed">
            {occupied} занято<br />{available} своб.
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-2.5">
          <div className="h-full bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }} />
        </div>
        <Legend units={units} />
      </div>

      {/* Rooms */}
      {filteredRooms.map(room => {
        const isDorm = room.units.some(u => u.unit_type === 'bed')
        const roomOcc = room.units.filter(u => u.status === 'occupied').length
        const roomAvail = room.units.filter(u => u.status === 'available').length

        const bunks: Array<[Unit, Unit | undefined]> = []
        if (isDorm) {
          for (let i = 0; i < room.units.length; i += 2) {
            bunks.push([room.units[i], room.units[i + 1]])
          }
        }

        return (
          <div key={room.roomId} className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-gray-500">
                    {room.roomName.match(/\d+/)?.[0] ?? '?'}
                  </span>
                </div>
                <span className="font-semibold text-sm text-gray-800">{room.roomName}</span>
                {isDorm && (
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">
                    {Math.ceil(room.units.length / 2)} кровати
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {roomOcc > 0 && (
                  <span className="flex items-center gap-1 text-primary-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400" /> {roomOcc} зан.
                  </span>
                )}
                {roomAvail > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {roomAvail} св.
                  </span>
                )}
              </div>
            </div>

            {isDorm ? (
              <div className="p-3 grid grid-cols-3 gap-2">
                {bunks.map(([lower, upper], idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    {upper ? (
                      <BedCell unit={upper} position="upper" onClick={() => handleUnitClick(upper)} />
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50" style={{ minHeight: 72 }} />
                    )}
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

      {picker && (
        <StatusPicker
          unit={picker}
          onSelect={(s) => changeStatus({ id: picker.id, status: s })}
          onClose={() => setPicker(null)}
        />
      )}

      {guestPanel && (
        <GuestPanel
          unit={guestPanel}
          onClose={() => setGuestPanel(null)}
          onChangeStatus={() => setPicker(guestPanel)}
          navigate={navigate}
        />
      )}
    </div>
  )
}
