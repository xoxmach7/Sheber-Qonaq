import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi } from '../../api'
import type { Unit, UnitStatus } from '../../types'
import { Wrench, Moon, CheckCircle2, Clock, Ban, Sparkles, ChevronDown } from 'lucide-react'

// ── Конфиг статусов ───────────────────────────────────────────────────────────

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
    label:  'Свободно',
    dot:    'bg-emerald-400',
    bg:     'bg-emerald-50',
    text:   'text-emerald-700',
    border: 'border-emerald-300',
    icon:   <CheckCircle2 size={12} className="text-emerald-500" />,
  },
  occupied: {
    label:  'Занято',
    dot:    'bg-sky-500',
    bg:     'bg-sky-50',
    text:   'text-sky-700',
    border: 'border-sky-300',
    icon:   <Moon size={12} className="text-sky-500" />,
  },
  reserved: {
    label:  'Бронь',
    dot:    'bg-violet-400',
    bg:     'bg-violet-50',
    text:   'text-violet-700',
    border: 'border-violet-300',
    icon:   <Clock size={12} className="text-violet-500" />,
  },
  dirty: {
    label:  'Уборка',
    dot:    'bg-amber-400',
    bg:     'bg-amber-50',
    text:   'text-amber-700',
    border: 'border-amber-300',
    icon:   <Sparkles size={12} className="text-amber-500" />,
  },
  maintenance: {
    label:  'Ремонт',
    dot:    'bg-orange-400',
    bg:     'bg-orange-50',
    text:   'text-orange-700',
    border: 'border-orange-300',
    icon:   <Wrench size={12} className="text-orange-500" />,
  },
  out_of_order: {
    label:  'Закрыто',
    dot:    'bg-gray-400',
    bg:     'bg-gray-100',
    text:   'text-gray-500',
    border: 'border-gray-300',
    icon:   <Ban size={12} className="text-gray-400" />,
  },
}

// ── Попап смены статуса ───────────────────────────────────────────────────────

interface StatusPickerProps {
  unit: Unit
  onSelect: (status: UnitStatus) => void
  onClose: () => void
}

function StatusPicker({ unit, onSelect, onClose }: StatusPickerProps) {
  const clickable: UnitStatus[] = ['available', 'dirty', 'maintenance', 'out_of_order']

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full bg-white rounded-t-2xl p-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
          {unit.name} — изменить статус
        </p>
        <div className="grid grid-cols-2 gap-2">
          {clickable.map(s => {
            const cfg = STATUS[s]
            const isCurrent = unit.status === s
            return (
              <button
                key={s}
                onClick={() => { onSelect(s); onClose() }}
                disabled={isCurrent}
                className={`
                  flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-medium transition
                  ${isCurrent
                    ? `${cfg.bg} ${cfg.border} ${cfg.text} opacity-60 cursor-default`
                    : `bg-white border-gray-200 text-gray-700 hover:${cfg.bg} active:scale-95`
                  }
                `}
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

// ── Одна ячейка кровати ───────────────────────────────────────────────────────

function BedCell({
  unit,
  position,
  onClick,
}: {
  unit: Unit
  position: 'lower' | 'upper'
  onClick: () => void
}) {
  const cfg = STATUS[unit.status]
  const posLabel = position === 'lower' ? '↓ Нижн.' : '↑ Верхн.'
  const posColor = position === 'lower' ? 'text-gray-400' : 'text-indigo-400'

  // Вытаскиваем короткое имя (К1-М3 → М3, или просто name)
  const shortName = unit.name.includes('-') ? unit.name.split('-')[1] : unit.name

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col w-full rounded-xl border p-2 text-left
        transition active:scale-95 touch-manipulation
        ${cfg.bg} ${cfg.border}
      `}
      style={{ minHeight: 72 }}
    >
      {/* Status dot */}
      <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${cfg.dot}`} />

      {/* Position label */}
      <span className={`text-[9px] font-semibold ${posColor} leading-none mb-1`}>
        {posLabel}
      </span>

      {/* Bed name */}
      <span className={`text-xs font-bold ${cfg.text} leading-none`}>{shortName}</span>

      {/* Status icon */}
      <div className="mt-1">{cfg.icon}</div>

      {/* Guest name for occupied */}
      {unit.status === 'occupied' && unit.current_guest && (
        <p className="text-[9px] text-sky-600 font-medium mt-0.5 leading-tight truncate w-full">
          {unit.current_guest.split(' ').slice(0, 2).join(' ')}
        </p>
      )}
    </button>
  )
}

// ── Группировка ───────────────────────────────────────────────────────────────

interface RoomGroup {
  roomId: number
  roomName: string
  roomType: string
  units: Unit[]
}

function groupByRoom(units: Unit[]): RoomGroup[] {
  const map = new Map<number, RoomGroup>()
  for (const u of units) {
    if (!map.has(u.room)) {
      map.set(u.room, {
        roomId:   u.room,
        roomName: u.room_name ?? `Комната ${u.room}`,
        roomType: u.unit_type === 'bed' ? 'dorm' : 'private',
        units:    [],
      })
    }
    map.get(u.room)!.units.push(u)
  }
  return Array.from(map.values())
}

// ── Легенда ───────────────────────────────────────────────────────────────────

function Legend({ units }: { units: Unit[] }) {
  const counts = units.reduce((acc, u) => {
    acc[u.status] = (acc[u.status] ?? 0) + 1
    return acc
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

// ── Главная страница ──────────────────────────────────────────────────────────

export default function OccupancyPage() {
  const qc = useQueryClient()
  const [picker, setPicker] = useState<Unit | null>(null)

  const { data: units = [], isLoading } = useQuery({
    queryKey:  ['units'],
    queryFn:   propertiesApi.allUnits,
    staleTime: 30_000,
  })

  const { mutate: changeStatus } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: UnitStatus }) =>
      propertiesApi.updateUnitStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  })

  const rooms    = groupByRoom(units)
  const occupied  = units.filter(u => u.status === 'occupied').length
  const available = units.filter(u => u.status === 'available').length
  const total     = units.length
  const pct       = total > 0 ? Math.round((occupied / total) * 100) : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">Карта размещения</h2>
        <p className="text-xs text-gray-400 mt-0.5">Нажмите на место чтобы изменить статус</p>
      </div>

      {/* Occupancy bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-3xl font-bold text-gray-900">{pct}%</span>
            <span className="text-sm text-gray-400 ml-1.5">заполнено</span>
          </div>
          <span className="text-xs text-gray-500 text-right leading-relaxed">
            {occupied} занято<br />{available} своб. · {total} всего
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-2.5">
          <div
            className="h-full bg-sky-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <Legend units={units} />
      </div>

      {/* Rooms */}
      {rooms.map(room => {
        const isDorm = room.units.some(u => u.unit_type === 'bed')
        const roomOccupied  = room.units.filter(u => u.status === 'occupied').length
        const roomAvailable = room.units.filter(u => u.status === 'available').length

        // Парное разбиение для дормитория: [0,1], [2,3], [4,5]...
        const bunks: Array<[Unit, Unit | undefined]> = []
        if (isDorm) {
          for (let i = 0; i < room.units.length; i += 2) {
            bunks.push([room.units[i], room.units[i + 1]])
          }
        }

        return (
          <div key={room.roomId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Room header */}
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
                    {room.units.length / 2} кровати
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {roomOccupied > 0 && (
                  <span className="flex items-center gap-1 text-sky-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    {roomOccupied} зан.
                  </span>
                )}
                {roomAvailable > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {roomAvailable} св.
                  </span>
                )}
              </div>
            </div>

            {/* Dorm — bunk pairs */}
            {isDorm ? (
              <div className="p-3 grid grid-cols-3 gap-2">
                {bunks.map(([lower, upper], idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    {/* Верхняя (upper) */}
                    {upper ? (
                      <BedCell
                        unit={upper}
                        position="upper"
                        onClick={() => setPicker(upper)}
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50" style={{ minHeight: 72 }} />
                    )}
                    {/* Нижняя (lower) */}
                    <BedCell
                      unit={lower}
                      position="lower"
                      onClick={() => setPicker(lower)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Private rooms — simple grid */
              <div className="p-3 grid grid-cols-3 gap-2">
                {room.units.map(unit => {
                  const cfg = STATUS[unit.status]
                  const shortName = unit.name.includes('-') ? unit.name.split('-')[1] : unit.name
                  return (
                    <button
                      key={unit.id}
                      onClick={() => setPicker(unit)}
                      className={`
                        relative flex flex-col items-center justify-center
                        rounded-xl border p-2 transition active:scale-95 touch-manipulation
                        ${cfg.bg} ${cfg.border}
                      `}
                      style={{ minHeight: 72 }}
                    >
                      <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${cfg.dot}`} />
                      <p className={`text-xs font-bold ${cfg.text}`}>{shortName}</p>
                      <div className="mt-1">{cfg.icon}</div>
                      {unit.status === 'occupied' && unit.current_guest && (
                        <p className="text-[9px] text-sky-600 font-medium mt-1 text-center leading-tight truncate w-full px-1">
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

      {/* Status picker popup */}
      {picker && (
        <StatusPicker
          unit={picker}
          onSelect={(newStatus) => changeStatus({ id: picker.id, status: newStatus })}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
