import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi, propertiesApi } from '../../api'
import { format, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Plus, X,
  Zap, ShoppingCart, Wrench, Users, Megaphone, Receipt, Package,
  Banknote, Smartphone, Building2, CreditCard,
} from 'lucide-react'
import type { Expense } from '../../types'
import type { LucideIcon } from 'lucide-react'

function fmt(n: number | string) {
  return Number(n).toLocaleString('ru-KZ', { maximumFractionDigits: 0 }) + ' ₸'
}

const METHOD_CONFIG: Record<string, {
  label: string
  Icon: LucideIcon
}> = {
  cash:          { label: 'Наличные', Icon: Banknote   },
  kaspi:         { label: 'Kaspi',    Icon: Smartphone  },
  bank_transfer: { label: 'Перевод',  Icon: Building2   },
  card:          { label: 'Карта',    Icon: CreditCard  },
}

const CATEGORY_OPTIONS: {
  value: string
  label: string
  hint: string
  Icon: LucideIcon
}[] = [
  { value: 'utility',     label: 'Коммуналка', hint: 'Свет, вода, газ, интернет',    Icon: Zap          },
  { value: 'supply',      label: 'Расходники',  hint: 'Бельё, химия, инвентарь',      Icon: ShoppingCart },
  { value: 'maintenance', label: 'Ремонт',      hint: 'Мебель, сантехника',            Icon: Wrench       },
  { value: 'salary',      label: 'Зарплата',    hint: 'Персонал, уборщица',            Icon: Users        },
  { value: 'advertising', label: 'Реклама',     hint: 'Instagram, OLX, баннер',        Icon: Megaphone    },
  { value: 'tax',         label: 'Налоги',      hint: 'ИП налог, патент',              Icon: Receipt      },
  { value: 'other',       label: 'Прочее',      hint: 'Всё остальное',                 Icon: Package      },
]

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map(c => [c.value, c.label])
)

// ── Форма добавления расхода ──────────────────────────────────────────────────
function ExpenseForm({ defaultDate, onClose }: { defaultDate: string; onClose: () => void }) {
  const qc = useQueryClient()

  const [form, setForm] = useState({
    category: '',
    amount: '',
    date: defaultDate,
    description: '',
  })
  const [error, setError] = useState('')

  // Берём первый объект (property) организации
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: propertiesApi.list,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Partial<Expense>) => paymentsApi.createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finances'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (e: any) =>
      setError(e?.response?.data?.detail ?? 'Ошибка при сохранении'),
  })

  const canSubmit = form.category && form.amount && form.date && !isPending
  const propertyId = properties[0]?.id

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-lg">Добавить расход</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-3 py-2">{error}</div>
          )}

          {/* Категория */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
              Категория *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map(({ value, label, hint, Icon }) => (
                <button
                  key={value}
                  onClick={() => setForm(f => ({ ...f, category: value }))}
                  className={`text-left px-3 py-2.5 rounded-xl border transition ${
                    form.category === value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon
                      size={14}
                      className={form.category === value ? 'text-white' : 'text-gray-400'}
                    />
                    <p className="text-sm font-medium">{label}</p>
                  </div>
                  <p className={`text-[10px] pl-5 ${
                    form.category === value ? 'text-primary-200' : 'text-gray-400'
                  }`}>{hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Сумма и дата */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">
                Сумма (₸) *
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">
                Дата *
              </label>
              <input
                type="date"
                className="input-field"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          {/* Описание */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">
              Описание
            </label>
            <input
              className="input-field"
              placeholder="Например: оплата за электричество май"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100">
          <button
            onClick={() => mutate({
              property: propertyId,
              category: form.category,
              amount: form.amount,
              date: form.date,
              description: form.description,
            })}
            disabled={!canSubmit}
            className="w-full bg-red-600 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 transition"
          >
            {isPending
              ? 'Сохраняем...'
              : `Записать расход ${form.amount ? '−' + fmt(form.amount) : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Страница Финансы ──────────────────────────────────────────────────────────
export default function FinancesPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  const currentMonth = format(subMonths(new Date(), -monthOffset), 'yyyy-MM')
  const displayMonth = format(subMonths(new Date(), -monthOffset), 'LLLL yyyy', { locale: ru })
  // Дата по умолчанию в форме расхода — сегодня, если текущий месяц; иначе 1-е число
  const defaultExpenseDate = monthOffset === 0
    ? format(new Date(), 'yyyy-MM-dd')
    : `${currentMonth}-01`

  const { data, isLoading } = useQuery({
    queryKey: ['finances', currentMonth],
    queryFn: () => paymentsApi.summary(currentMonth),
  })

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-xl active:scale-95 touch-manipulation"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="text-base font-bold text-gray-900 capitalize">{displayMonth}</h2>
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          disabled={monthOffset >= 0}
          className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-xl disabled:opacity-30"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* P&L Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
              <TrendingUp size={16} className="mx-auto text-green-600 mb-1" />
              <p className="text-xs text-green-600 mb-0.5">Доход</p>
              <p className="text-sm font-bold text-green-800 leading-tight">
                {fmt(data?.income ?? 0)}
              </p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
              <TrendingDown size={16} className="mx-auto text-red-500 mb-1" />
              <p className="text-xs text-red-500 mb-0.5">Расходы</p>
              <p className="text-sm font-bold text-red-700 leading-tight">
                {fmt(data?.expenses ?? 0)}
              </p>
            </div>
            <div className={`border rounded-2xl p-3 text-center ${
              Number(data?.net_profit ?? 0) >= 0
                ? 'bg-primary-50 border-primary-100'
                : 'bg-orange-50 border-orange-100'
            }`}>
              <Minus size={16} className="mx-auto text-primary-600 mb-1" />
              <p className="text-xs text-primary-600 mb-0.5">Прибыль</p>
              <p className={`text-sm font-bold leading-tight ${
                Number(data?.net_profit ?? 0) >= 0 ? 'text-primary-800' : 'text-orange-700'
              }`}>
                {fmt(data?.net_profit ?? 0)}
              </p>
            </div>
          </div>

          {/* Debt */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-orange-800">Общий долг гостей</span>
            <span className="font-bold text-orange-700">{fmt(data?.total_debt ?? 0)}</span>
          </div>

          {/* Income by method */}
          {data?.income_by_method && Object.values(data.income_by_method).some(v => Number(v) > 0) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h3 className="font-semibold text-gray-800 text-sm">Доход по методам оплаты</h3>
              </div>
              {Object.entries(data.income_by_method)
                .filter(([, v]) => Number(v) > 0)
                .sort(([, a], [, b]) => Number(b) - Number(a))
                .map(([method, amount]) => {
                  const cfg = METHOD_CONFIG[method]
                  const Icon = cfg?.Icon
                  return (
                    <div key={method} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2.5">
                        {Icon && (
                          <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Icon size={14} className="text-gray-500" />
                          </div>
                        )}
                        <span className="text-sm text-gray-700">{cfg?.label ?? method}</span>
                      </div>
                      <span className="text-sm font-semibold text-green-700">+{fmt(amount)}</span>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Expenses by category */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h3 className="font-semibold text-gray-800 text-sm">Расходы по категориям</h3>
              <button
                onClick={() => setShowExpenseForm(true)}
                className="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg text-xs font-semibold active:scale-95 touch-manipulation"
              >
                <Plus size={13} /> Добавить
              </button>
            </div>
            {data?.expenses_by_category && Object.values(data.expenses_by_category).some(v => Number(v) > 0) ? (
              Object.entries(data.expenses_by_category)
                .filter(([, v]) => Number(v) > 0)
                .sort(([, a], [, b]) => Number(b) - Number(a))
                .map(([cat, amount]) => {
                  const catCfg = CATEGORY_OPTIONS.find(c => c.value === cat)
                  const Icon = catCfg?.Icon
                  return (
                    <div key={cat} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2.5">
                        {Icon && (
                          <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Icon size={14} className="text-gray-500" />
                          </div>
                        )}
                        <span className="text-sm text-gray-700">{CATEGORY_LABELS[cat] ?? cat}</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">−{fmt(amount)}</span>
                    </div>
                  )
                })
            ) : (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                <p>Расходов за этот месяц нет</p>
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="mt-2 text-primary-600 font-medium text-xs"
                >
                  + Добавить первый расход
                </button>
              </div>
            )}
          </div>

          {/* Hint */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-600">Как формируются данные:</p>
            <p><span className="font-medium text-gray-700">Доход</span> — из оплат гостей (Заезды → Оплата)</p>
            <p><span className="font-medium text-gray-700">Расходы</span> — добавляются вручную кнопкой выше</p>
            <p><span className="font-medium text-gray-700">Долг</span> — сумма недоплат по всем активным заездам</p>
          </div>
        </>
      )}

      {showExpenseForm && (
        <ExpenseForm
          defaultDate={defaultExpenseDate}
          onClose={() => setShowExpenseForm(false)}
        />
      )}
    </div>
  )
}
