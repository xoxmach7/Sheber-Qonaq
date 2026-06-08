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
  role: UserRole
  organization: number
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
  is_active: boolean
}

export interface Room {
  id: number
  property: number
  property_name: string
  name: string
  room_type: 'dorm' | 'private'
  floor: number
  max_capacity: number
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
  iin_display?: string
  notes?: string
  is_blacklisted?: boolean
  nationality?: string
  is_foreigner?: boolean
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
}

// ─── Stay ────────────────────────────────────────────────────────────────────
export type RateType = 'daily' | 'weekly' | 'monthly'
export type StayStatus = 'active' | 'checked_out' | 'cancelled' | 'no_show'
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
}

export interface UnitShort {
  id: number
  name: string
  unit_type: string
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
  rate_amount: string
  deposit_amount: string
  status: StayStatus
  source: StaySource
  mpis_status: MpisStatus
  mpis_status_display?: string
  total_paid: string
  total_expected: string
  balance: string
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
  month: string
  income: number
  expenses: number
  net_profit: number
  total_debt: number
  income_by_method: Record<PaymentMethod, number>
  expenses_by_category: Record<string, number>
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
  status: LeadStatus
  unit_type_interest?: string
  expected_check_in?: string
  notes?: string
  created_at: string
}

export interface Viewing {
  id: number
  lead: number
  lead_name: string
  lead_phone: string
  scheduled_at: string
  outcome?: string
  notes?: string
  reminder_sent: boolean
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
  full_name: string
  phone?: string
  iin?: string
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
