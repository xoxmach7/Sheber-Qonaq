import api from './client'
import type {
  LoginCredentials, AuthTokens, User,
  Property, Room, Unit,
  Guest, GuestCreate,
  Stay, StayCreate, MpisStatus,
  Payment, PaymentCreate, Expense, FinanceSummary,
  Lead, Viewing,
  DashboardData,
  PaginatedResponse,
  BlacklistEntry, BlacklistCreate, BlacklistCheck,
} from '../types'

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (creds: LoginCredentials) =>
    api.post<AuthTokens>('/auth/login/', creds).then(r => r.data),

  refresh: (refresh: string) =>
    api.post<{ access: string }>('/auth/refresh/', { refresh }).then(r => r.data),

  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),

  me: () =>
    api.get<User>('/users/me/').then(r => r.data),
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () =>
    api.get<DashboardData>('/dashboard/').then(r => r.data),
}

// ─── Properties / Rooms / Units ──────────────────────────────────────────────
export const propertiesApi = {
  list: () =>
    api.get<PaginatedResponse<Property>>('/properties/').then(r => r.data.results),

  rooms: (propertyId?: number) =>
    api.get<PaginatedResponse<Room>>('/rooms/', { params: propertyId ? { property: propertyId } : {} })
       .then(r => r.data.results),

  units: (roomId?: number) =>
    api.get<PaginatedResponse<Unit>>('/units/', { params: roomId ? { room: roomId } : {} })
       .then(r => r.data.results),

  allUnits: () =>
    api.get<PaginatedResponse<Unit>>('/units/').then(r => r.data.results),

  updateUnitStatus: (id: number, status: Unit['status']) =>
    api.patch<Unit>(`/units/${id}/`, { status }).then(r => r.data),
}

// ─── Guests ──────────────────────────────────────────────────────────────────
export const guestsApi = {
  list: (search?: string) =>
    api.get<PaginatedResponse<Guest>>('/guests/', { params: search ? { search } : {} })
       .then(r => r.data),

  get: (id: number) =>
    api.get<Guest>(`/guests/${id}/`).then(r => r.data),

  create: (data: GuestCreate) =>
    api.post<Guest>('/guests/', data).then(r => r.data),

  update: (id: number, data: Partial<GuestCreate>) =>
    api.patch<Guest>(`/guests/${id}/`, data).then(r => r.data),

  checkBlacklist: (iin?: string, phone?: string) =>
    api.get('/blacklist/check/', { params: { iin, phone } }).then(r => r.data),
}

// ─── Stays ───────────────────────────────────────────────────────────────────
export const staysApi = {
  list: () =>
    api.get<PaginatedResponse<Stay>>('/stays/').then(r => r.data),

  active: () =>
    api.get<Stay[]>('/stays/active/').then(r => r.data),

  expiringSoon: () =>
    api.get<Stay[]>('/stays/expiring_soon/').then(r => r.data),

  get: (id: number) =>
    api.get<Stay>(`/stays/${id}/`).then(r => r.data),

  create: (data: StayCreate) =>
    api.post<Stay>('/stays/', data).then(r => r.data),

  checkout: (id: number, date?: string) =>
    api.post(`/stays/${id}/checkout/`, date ? { actual_check_out_date: date } : {}).then(r => r.data),

  extend: (id: number, newDate: string) =>
    api.post(`/stays/${id}/extend/`, { new_check_out_date: newDate }).then(r => r.data),

  updateMpis: (id: number, mpis_status: MpisStatus) =>
    api.patch<{ id: number; mpis_status: MpisStatus; mpis_status_display: string }>(
      `/stays/${id}/mpis/`, { mpis_status }
    ).then(r => r.data),
}

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentsApi = {
  list: (stayId?: number) =>
    api.get<PaginatedResponse<Payment>>('/payments/', { params: stayId ? { stay: stayId } : {} })
       .then(r => r.data),

  create: (data: PaymentCreate) =>
    api.post<Payment>('/payments/', data).then(r => r.data),

  expenses: () =>
    api.get<PaginatedResponse<Expense>>('/expenses/').then(r => r.data),

  createExpense: (data: Partial<Expense>) =>
    api.post<Expense>('/expenses/', data).then(r => r.data),

  summary: (month: string) =>
    api.get<FinanceSummary>('/summary/', { params: { month } }).then(r => r.data),
}

// ─── Blacklist ───────────────────────────────────────────────────────────────
export const blacklistApi = {
  list: (search?: string) =>
    api.get<PaginatedResponse<BlacklistEntry>>('/blacklist/', {
      params: search ? { search } : {},
    }).then(r => r.data),

  create: (data: BlacklistCreate) =>
    api.post<BlacklistEntry>('/blacklist/', data).then(r => r.data),

  deactivate: (id: number) =>
    api.delete(`/blacklist/${id}/`),

  check: (phone?: string, iin?: string) =>
    api.post<BlacklistCheck>('/blacklist/check/', { phone, iin }).then(r => r.data),
}

// ─── Leads ───────────────────────────────────────────────────────────────────
export const leadsApi = {
  list: () =>
    api.get<PaginatedResponse<Lead>>('/leads/').then(r => r.data),

  create: (data: Partial<Lead>) =>
    api.post<Lead>('/leads/', data).then(r => r.data),

  update: (id: number, data: Partial<Lead>) =>
    api.patch<Lead>(`/leads/${id}/`, data).then(r => r.data),

  scheduleViewing: (leadId: number, scheduledAt: string) =>
    api.post(`/leads/${leadId}/schedule_viewing/`, { scheduled_at: scheduledAt }).then(r => r.data),

  todayViewings: () =>
    api.get<Viewing[]>('/viewings/today/').then(r => r.data),

  viewings: () =>
    api.get<PaginatedResponse<Viewing>>('/viewings/').then(r => r.data),
}
