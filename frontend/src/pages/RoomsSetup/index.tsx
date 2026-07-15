import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Building2 } from 'lucide-react'
import { propertiesApi } from '../../api'

type RoomType = 'dorm' | 'private' | 'family'

interface RoomDraft {
  name: string
  type: RoomType
  beds: number
}

const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  dorm: 'Двухъярусные кровати',
  private: 'Одноместная комната',
  family: 'Семейный номер',
}

export default function RoomsSetupPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [rooms, setRooms] = useState<RoomDraft[]>([
    { name: '', type: 'private', beds: 1 },
  ])

  const mutation = useMutation({
    mutationFn: () => propertiesApi.setupRooms(
      rooms
        .filter(r => r.name.trim())
        .map(r => ({ name: r.name.trim(), type: r.type, beds: r.type === 'dorm' ? r.beds : undefined }))
    ),
    onSuccess: async () => {
      // refetchQueries (не invalidateQueries) — дожидаемся СВЕЖИХ данных перед
      // навигацией. invalidateQueries только помечает кэш устаревшим и планирует
      // фоновый рефетч, не дожидаясь его: ProtectedRoute успевал отрендериться
      // со старым closure dashboard.occupancy.total === 0 и снова редиректить
      // на /setup-rooms — пользователь видел форму добавления комнат повторно.
      await qc.refetchQueries({ queryKey: ['dashboard'] })
      navigate('/dashboard')
    },
  })

  const addRoom = () => setRooms(rs => [...rs, { name: '', type: 'private', beds: 1 }])
  const removeRoom = (i: number) => setRooms(rs => rs.filter((_, idx) => idx !== i))
  const updateRoom = (i: number, patch: Partial<RoomDraft>) =>
    setRooms(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  const hasValidRoom = rooms.some(r => r.name.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (hasValidRoom) mutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center">
            <Building2 size={22} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">Добавьте первые комнаты</h1>
            <p className="text-xs text-gray-400">Их можно будет изменить в любой момент</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          {rooms.map((room, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  className="input-field flex-1"
                  placeholder="Название, например «Комната 1»"
                  value={room.name}
                  onChange={e => updateRoom(i, { name: e.target.value })}
                />
                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRoom(i)}
                    className="p-2 text-gray-400 hover:text-red-500 shrink-0"
                    aria-label="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(ROOM_TYPE_LABEL) as RoomType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateRoom(i, { type: t })}
                    className={`py-1.5 rounded-lg border text-[11px] font-semibold leading-tight ${room.type === t
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-500'}`}
                  >
                    {ROOM_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>

              {room.type === 'dorm' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Количество кроватей</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className="input-field w-20 py-1.5 text-sm"
                    value={room.beds}
                    onChange={e => updateRoom(i, { beds: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addRoom}
            className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-500 flex items-center justify-center gap-1.5 hover:border-primary-300 hover:text-primary-600"
          >
            <Plus size={16} /> Добавить ещё комнату
          </button>

          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
              Не удалось сохранить. Проверьте данные и попробуйте снова.
            </div>
          )}

          <button
            type="submit"
            disabled={!hasValidRoom || mutation.isPending}
            className="w-full py-3 bg-primary-500 text-white rounded-2xl text-sm font-semibold disabled:opacity-40"
          >
            {mutation.isPending ? 'Сохраняем...' : 'Готово'}
          </button>
        </form>
      </div>
    </div>
  )
}
