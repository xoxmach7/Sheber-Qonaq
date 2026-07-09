// ─── Auth ────────────────────────────────────────────────────────────────────
export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: UserRole
  role_display?: string
  organization: number
  is_active?: boolean
}

export interface UserCreate {
  username: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
  role: UserRole
}

export type UserRole =
  | 'superadmin'
  | 'owner'
  | 'manager'
  | 'reception'
  | 'housekeeping'
  | 'maintenance'
  | 'accountant'

// ─── Organization ────────────────────────────────────────────────────────────
export interface Organization {
  id: number
  name: string
  slug: string
  plan: 'free' | 'basic' | 'pro'
  is_active: boolean
}

// ─── Property / Room / Unit ──────────────────────────────────────────────────
export interface Property {
  id: number
  name: string
  address: string
  city: string
  description?: string
  is_active: boolean
  rooms_count?: number
  created_at?: string
}

export interface Room {
  id: number
  property: number
  name: string
  number?: string
  room_type: 'dorm' | 'private'
  floor: number
  max_capacity: number
  description?: string
  units?: Unit[]
  units_count?: number
  available_count?: number
}

export type UnitStatus =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'dirty'
  | 'maintenance'
  | 'out_of_order'

export type UnitType =
  | 'bed'
  | 'private_room'
  | 'apartment'
  | 'studio'
  | 'family_room'

export interface Unit {
  id: number
  room: number
  room_name: string
  name: string
  unit_type: UnitType
  status: UnitStatus
  current_guest?: string
  current_stay_id?: number
  current_guest_phone?: string
  check_in?: string
  check_out?: string
  // Будущая бронь на юните (reserved/confirmed), независимо от unit.status
  has_booking?: boolean
  next_check_in?: string
  next_check_out?: string
  next_booking_guest?: string
  next_booking_status?: 'reserved' | 'confirmed'
  next_stay_id?: number
  bookings_count?: number
  upcoming_bookings?: {
    stay_id: number
    check_in: string
    check_out: string
    guest: string
    status: 'reserved' | 'confirmed'
  }[]
}

// ─── Guest ───────────────────────────────────────────────────────────────────
export interface Guest {
  id: number
  first_name: string
  last_name: string
  middle_name?: string
  full_name: string
  phone: string
  email?: string
  iin?: string
  notes?: string
  is_blacklisted?: boolean
  nationality?: string
  is_foreigner?: boolean
  document_type?: string
  document_number?: string
  sex?: 'M' | 'F' | ''
  date_of_birth?: string
  document_issue_date?: string
  document_expiry_date?: string
  entry_date?: string
  migration_card_number?: string
  created_at: string
}

export interface GuestCreate {
  first_name: string
  last_name: string
  middle_name?: string
  phone: string
  email?: string
  iin?: string
  notes?: string
  nationality?: string
  is_foreigner?: boolean
  document_type?: string
  document_number?: string
  sex?: 'M' | 'F' | ''
  date_of_birth?: string
  document_issue_date?: string
  document_expiry_date?: string
  entry_date?: string
  migration_card_number?: string
}

// ─── Stay ────────────────────────────────────────────────────────────────────
export type RateType = 'daily' | 'weekly' | 'monthly'
export type StayStatus = 'reserved' | 'confirmed' | 'active' | 'checked_out' | 'cancelled' | 'no_show' | 'expired'
export type MpisStatus = 'not_required' | 'pending' | 'submitted' | 'confirmed'
export type StaySource =
  | 'direct'
  | 'krisha'
  | 'olx'
  | 'booking'
  | 'instagram'
  | 'referral'
  | 'other'

export interface GuestShort {
  id: number
  full_name: string
  phone: string
  nationality?: string
  is_foreigner?: boolean
  document_type?: string
  document_number?: string
  sex?: 'M' | 'F' | ''
  date_of_birth?: string
  document_issue_date?: string
  document_expiry_date?: string
  entry_date?: string
  migration_card_number?: string
}

export interface UnitShort {
  id: number
  name: string
  unit_type: string
  room_name?: string
}

export interface Stay {
  id: number
  unit: number
  unit_detail?: UnitShort
  guest: number
  guest_detail?: GuestShort
  check_in_date: string
  expected_check_out_date: string
  actual_check_out_date?: string
  rate_type: RateType
  rate_type_display?: string
  rate_amount: string
  deposit_amount: string
  manual_total_override?: string | null
  status: StayStatus
  status_display?: string
  source: StaySource
  source_display?: string
  notes?: string
  mpis_status: MpisStatus
  mpis_status_display?: string
  total_paid: string
  total_expected: string
  balance: string
  has_debt?: boolean
  created_at: string
}

export interface StayCreate {
  unit: number
  guest: number
  check_in_date: string
  expected_check_out_date: string
  rate_type: RateType
  rate_amount: string | number
  deposit_amount?: string | number
  source?: StaySource
  status?: StayStatus
}

// ─── Payment ─────────────────────────────────────────────────────────────────
export type PaymentMethod = 'cash' | 'kaspi' | 'bank_transfer' | 'card'

export interface Payment {
  id: number
  stay: number
  stay_info?: string
  amount: string
  payment_date: string
  method: PaymentMethod
  period_from?: string
  period_to?: string
  notes?: string
}

export interface PaymentCreate {
  stay: number
  amount: string | number
  payment_date: string
  method: PaymentMethod
  period_from?: string
  period_to?: string
  notes?: string
}

export interface Expense {
  id: number
  property: number
  category: string
  amount: string
  date: string
  description?: string
}

export interface FinanceSummary {
  period_start: string
  period_end: string
  income: number | string
  expenses: number | string
  net_profit: number | string
  total_debt: number | string
  payments_count: number
  income_by_method: Record<string, string | number>
  expenses_by_category: Record<string, string | number>
}

// ─── Lead ────────────────────────────────────────────────────────────────────
export type LeadStatus =
  | 'new'
  | 'viewing_scheduled'
  | 'viewed'
  | 'negotiating'
  | 'won'
  | 'lost'

export interface Lead {
  id: number
  name: string
  phone: string
  source?: string
  source_display?: string
  status: LeadStatus
  status_display?: string
  interested_unit_type?: string
  budget_min?: string
  budget_max?: string
  notes?: string
  converted_to_guest?: number | null
  converted_at?: string | null
  viewings?: Viewing[]
  next_viewing?: Viewing | null
  created_at: string
}

export interface Viewing {
  id: number
  lead: number
  lead_name?: string
  lead_phone?: string
  scheduled_at: string
  conducted_at?: string | null
  outcome?: string
  outcome_display?: string
  notes?: string
  reminder_sent: boolean
  created_at?: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardData {
  occupancy: {
    total: number
    occupied: number
    available: number
    reserved: number
    dirty: number
    maintenance: number
    out_of_order: number
    rate: number
  }
  finances: {
    income_this_month: number
    expenses_this_month: number
    net_profit: number
    total_active_debt: number
    debtors_count: number
  }
  today: {
    checkins: Array<{
      id: number
      guest__first_name: string
      guest__last_name: string
      guest__phone: string
      unit__name: string
      status: string
    }>
    checkouts: Array<{
      id: number
      guest__first_name: string
      guest__last_name: string
      guest__phone: string
      unit__name: string
    }>
    viewings: Array<{
      id: number
      lead__name: string
      lead__phone: string
      scheduled_at: string
      outcome?: string
    }>
  }
  alerts: {
    expiring_soon_count: number
    mpis_pending_count: number
    debtors: Array<{
      stay_id: number
      guest_name: string
      guest_phone: string
      unit_name: string
      debt: string
    }>
  }
  kpi?: {
    active_bookings: number
    violations_this_month: number
  }
}

// ─── Blacklist ───────────────────────────────────────────────────────────────
export type BlacklistReason =
  | 'debt'
  | 'theft'
  | 'vandalism'
  | 'fraud'
  | 'behavior'
  | 'other'

export interface BlacklistEntry {
  id: number
  full_name: string
  iin?: string
  phone: string
  guest?: number | null
  guest_name?: string | null
  reason: BlacklistReason
  reason_display: string
  description: string
  evidence_url?: string
  reported_by?: number
  reported_by_name?: string
  is_verified: boolean
  is_active: boolean
  created_at: string
}

export interface BlacklistCreate {
  full_name?: string
  phone?: string
  iin?: string
  guest?: number | null
  reason: BlacklistReason
  description: string
  evidence_url?: string
}

export interface BlacklistCheck {
  is_blacklisted: boolean
  entries: BlacklistEntry[]
}

// ─── Pagination ──────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// -- Notifications ------------------------------------------------------------
export type NotificationType = 'debt' | 'expiring' | 'overdue' | 'info'

export interface Notification {
  id: number
  type: NotificationType
  type_display: string
  title: string
  body: string
  is_read: boolean
  stay_id?: number
  guest_name: string
  created_at: string
}

export interface NotificationsResponse {
  results: Notification[]
  unread_count: number
}


// ─── Occupancy / Availability (heatmap, Шаг 5) ───────────────────────────────
export interface OccupancyDay { occupied: number; total: number; rate: number }
export interface OccupancyCalendar {
  from: string
  to: string
  total_units: number
  days: Record<string, OccupancyDay>
}
export interface AvailabilityUnit {
  unit: number
  name: string
  room_name: string
  unit_type: string
  unit_type_display: string
  property: number
  rates: Record<string, number>
  nights: number
  total: string | null
}
export interface AvailabilityResponse {
  from: string
  to: string
  nights: number
  count: number
  results: AvailabilityUnit[]
}
