import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi, propertiesApi } from '../../api'
import { format, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Plus, X,
  Zap, ShoppingCart, Wrench, Users, Megaphone, Receipt, Package,
  Banknote, Smartphone, Building2, CreditCard, Trash2, Lock,
} from 'lucide-react'
import type { Expense } from '../../types'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '../../store/auth'

function fmt(n: number | string) {
  return Number(n).toLocaleString('ru-KZ', { maximumFractionDigits: 0 }) + ' ₸'
}

const METHOD_CONFIG: Record<string, { label: string; Icon: LucideIcon }> = {
  cash:          { label: 'Наличные', Icon: Banknote },
  kaspi:         { label: 'Kaspi',    Icon: Smartphone },
  bank_transfer: { label: 'Перевод',  Icon: Building2 },
  card:          { label: 'Карта',    Icon: CreditCard },
}

const CATEGORY_OPTIONS: { value: string; label: string; hint: string; Icon: LucideIcon }[] = [
  { value: 'utility',     label: 'Коммуналка', hint: 'Свет, вода, газ, интернет',    Icon: Zap },
  { value: 'supply',      label: 'Расходники', hint: 'Бельё, химия, инвентарь',      Icon: ShoppingCart },
  { value: 'maintenance', label: 'Ремонт',     hint: 'Мебель, сантехника',            Icon: Wrench },
  { value: 'salary',      label: 'Зарплата',   hint: 'Персонал, уборщица',            Icon: Users },
  { value: 'advertising', label: 'Реклама',    hint: 'Instagram, OLX, баннер',        Icon: Megaphone },
  { value: 'tax',         label: 'Налоги',     hint: 'ИП налог, патент',              Icon: Receipt },
  { value: 'other',       label: 'Прочее',     hint: 'Всё остальное',                 Icon: Package },
]

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map(c => [c.value, c.label])
)

// ── Expense Form ──
function ExpenseForm({ defaultDate, onClose }: { defaultDate: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ category: '', amount: '', date: defaultDate, description: '' })
  const [error, setError] = useState('')

  const { data: properties = [] } = useQuery({ queryKey: ['properties'], queryFn: propertiesApi.list })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Partial<Expense>) => paymentsApi.createExpense(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finances'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); onClose() },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Ошибка при сохранении'),
  })

  const canSubmit = form.category && form.amount && form.date && !isPending
  const propertyId = properties[0]?.id

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-[20px] shadow-sheet animate-slide-up max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-lg">Добавить расход</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-3 py-2">{error}</div>}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Категория *</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map(({ value, label, hint, Icon }) => (
                <button key={value} onClick={() => setForm(f => ({ ...f, category: value }))}
                  className={`text-left px-3 py-2.5 rounded-xl border transition tap-card ${
                    form.category === value ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-700 border-gray-200'
                  }`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon size={14} className={form.category === value ? 'text-white' : 'text-gray-400'} />
                    <p className="text-sm font-medium">{label}</p>
                  </div>
                  <p className={`text-[10px] pl-5 ${form.category === value ? 'text-primary-200' : 'text-gray-400'}`}>{hint}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Сумма (₸) *</label>
              <input type="number" className="input-field" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Дата *</label>
              <input type="date" className="input-field" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Описание</label>
            <input className="input-field" placeholder="Например: оплата за электричество май"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-gray-100">
          <button onClick={() => mutate({ property: propertyId, category: form.category, amount: form.amount, date: form.date, description: form.description })}
            disabled={!canSubmit}
            className="w-full bg-red-600 text-white py-3.5 rounded-xl font-semibold disabled:bg-gray-200 disabled:text-gray-400 transition tap-card">
            {isPending ? 'Сохраняем...' : `Записать расход ${form.amount ? '−' + fmt(form.amount) : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──
export default function FinancesPage() {
  const role = useAuthStore(s => s.user?.role)
  const canFinance = ['superadmin', 'owner'].includes(role ?? '')
  const [monthOffset, setMonthOffset] = useState(0)
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  if (!canFinance) return (
    <div className="px-4 py-20 text-center text-gray-400">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <Lock size={28} className="text-gray-400" />
      </div>
      <p className="font-semibold text-gray-600">Раздел недоступен</p>
      <p className="text-sm mt-1">Финансы видны только владельцу</p>
    </div>
  )

  const currentMonth = format(subMonths(new Date(), -monthOffset), 'yyyy-MM')
  const displayMonth = format(subMonths(new Date(), -monthOffset), 'LLLL yyyy', { locale: ru })
  const defaultExpenseDate = monthOffset === 0 ? format(new Date(), 'yyyy-MM-dd') : `${currentMonth}-01`

  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['finances', currentMonth],
    queryFn: () => paymentsApi.summary(currentMonth),
  })

  // Отдельные расходы за выбранный месяц (с датами + удаление)
  const { data: expensesData } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => paymentsApi.expenses(),
  })
  const monthExpenses = (expensesData?.results ?? [])
    .filter(e => (e.date ?? '').startsWith(currentMonth))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const { mutate: deleteExpense } = useMutation({
    mutationFn: (id: number) => paymentsApi.deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finances'] })
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMonthOffset(o => o - 1)}
          className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-card tap-card">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="text-base font-bold text-gray-900 capitalize">{displayMonth}</h2>
        <button onClick={() => setMonthOffset(o => o + 1)} disabled={monthOffset >= 0}
          className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-card disabled:opacity-30 tap-card">
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
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-emerald-50 rounded-2xl p-4 ring-1 ring-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <TrendingUp size={16} className="text-white" />
                </div>
                <span className="text-xs text-emerald-600 font-semibold">Доход</span>
              </div>
              <p className="text-xl font-bold text-emerald-800">{fmt(data?.income ?? 0)}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-4 ring-1 ring-red-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                  <TrendingDown size={16} className="text-white" />
                </div>
                <span className="text-xs text-red-600 font-semibold">Расходы</span>
              </div>
              <p className="text-xl font-bold text-red-700">{fmt(data?.expenses ?? 0)}</p>
            </div>
          </div>

          {/* Profit + Debt */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`rounded-2xl p-4 ring-1 ${Number(data?.net_profit ?? 0) >= 0 ? 'bg-primary-50 ring-primary-100' : 'bg-orange-50 ring-orange-100'}`}>
              <span className="text-xs text-primary-600 font-semibold">Прибыль</span>
              <p className={`text-xl font-bold mt-1 ${Number(data?.net_profit ?? 0) >= 0 ? 'text-primary-800' : 'text-orange-700'}`}>
                {fmt(data?.net_profit ?? 0)}
              </p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 ring-1 ring-amber-100">
              <span className="text-xs text-amber-700 font-semibold">Долги гостей</span>
              <p className="text-xl font-bold text-amber-800 mt-1">{fmt(data?.total_debt ?? 0)}</p>
            </div>
          </div>

          {/* Income by method */}
          {data?.income_by_method && Object.values(data.income_by_method).some(v => Number(v) > 0) && (
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
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
                        {Icon && <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center"><Icon size={15} className="text-gray-500" /></div>}
                        <span className="text-sm text-gray-700">{cfg?.label ?? method}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">+{fmt(amount)}</span>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Expenses by category */}
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h3 className="font-semibold text-gray-800 text-sm">Расходы по категориям</h3>
              <button onClick={() => setShowExpenseForm(true)}
                className="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg text-xs font-semibold tap-card ring-1 ring-red-100">
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
                        {Icon && <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center"><Icon size={15} className="text-gray-500" /></div>}
                        <span className="text-sm text-gray-700">{CATEGORY_LABELS[cat] ?? cat}</span>
                      </div>
                      <span className="text-sm font-bold text-red-600">−{fmt(amount)}</span>
                    </div>
                  )
                })
            ) : (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                <p>Расходов за этот месяц нет</p>
                <button onClick={() => setShowExpenseForm(true)} className="mt-2 text-primary-600 font-medium text-xs">+ Добавить первый расход</button>
              </div>
            )}
          </div>

          {/* Список расходов с датами */}
          {monthExpenses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h3 className="font-semibold text-gray-800 text-sm">Список расходов · {displayMonth}</h3>
              </div>
              {monthExpenses.map(exp => {
                const catCfg = CATEGORY_OPTIONS.find(c => c.value === exp.category)
                const Icon = catCfg?.Icon ?? Package
                return (
                  <div key={exp.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{exp.description || CATEGORY_LABELS[exp.category] || exp.category}</p>
                      <p className="text-xs text-gray-400">
                        {CATEGORY_LABELS[exp.category] ?? exp.category} · {format(new Date(exp.date + 'T12:00:00'), 'd MMM yyyy', { locale: ru })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-red-600 shrink-0">−{fmt(exp.amount)}</span>
                    <button
                      onClick={() => { if (confirm('Удалить этот расход?')) deleteExpense(exp.id) }}
                      className="p-1.5 text-gray-300 hover:text-red-500 shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {showExpenseForm && <ExpenseForm defaultDate={defaultExpenseDate} onClose={() => setShowExpenseForm(false)} />}
    </div>
  )
}
