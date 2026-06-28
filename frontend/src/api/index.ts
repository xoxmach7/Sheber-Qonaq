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
  NotificationsResponse, OccupancyCalendar, AvailabilityResponse, } from '../types'

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
    api.patch<Unit>(`/units/${id}/set_status/`, { status }).then(r => r.data),
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

  remove: (id: number) =>
    api.delete<{ archived?: boolean; detail?: string }>(`/guests/${id}/`).then(r => r.data),

  checkBlacklist: (iin?: string, phone?: string) =>
    api.post<BlacklistCheck>('/guests/check_blacklist/', { iin, phone }).then(r => r.data),
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

  confirm: (id: number) =>
    api.post<Stay>(`/stays/${id}/confirm/`).then(r => r.data),

  cancel: (id: number) =>
    api.post<Stay>(`/stays/${id}/cancel/`).then(r => r.data),

  checkIn: (id: number) =>
    api.post<Stay>(`/stays/${id}/check-in/`).then(r => r.data),

  updateDates: (id: number, check_in_date: string, expected_check_out_date: string) =>
    api.patch<Stay>(`/stays/${id}/`, { check_in_date, expected_check_out_date }).then(r => r.data),

  checkout: (id: number, date?: string) =>
    api.post(`/stays/${id}/checkout/`, date ? { actual_check_out_date: date } : {}).then(r => r.data),

  extend: (id: number, newDate: string) =>
    api.post(`/stays/${id}/extend/`, { new_check_out_date: newDate }).then(r => r.data),

  updateMpis: (id: number, mpis_status: MpisStatus) =>
    api.patch<{ id: number; mpis_status: MpisStatus; mpis_status_display: string }>(
      `/stays/${id}/mpis/`, { mpis_status }
    ).then(r => r.data),

  occupancyCalendar: (from: string, to: string, property?: number) =>
    api.get<OccupancyCalendar>('/stays/occupancy-calendar/', {
      params: { from, to, ...(property ? { property } : {}) },
    }).then(r => r.data),

  availability: (from: string, to: string, opts?: { unit_type?: string; property?: number }) =>
    api.get<AvailabilityResponse>('/stays/availability/', {
      params: { from, to, ...(opts || {}) },
    }).then(r => r.data),
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

  deleteExpense: (id: number) =>
    api.delete(`/expenses/${id}/`),

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

  update: (id: number, data: Partial<BlacklistCreate>) =>
    api.patch<BlacklistEntry>(`/blacklist/${id}/`, data).then(r => r.data),

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
    api.get<Viewing[]>('/leads/today_viewings/').then(r => r.data),

  viewings: () =>
    api.get<PaginatedResponse<Viewing>>('/viewings/').then(r => r.data),
}

export const notificationsApi = {
  list: () =>
    api.get<NotificationsResponse>('/notifications/').then(r => r.data),

  markRead: (id: number) =>
    api.post(`/notifications/${id}/read/`).then(r => r.data),

  markAllRead: () =>
    api.post('/notifications/read-all/').then(r => r.data),
}
