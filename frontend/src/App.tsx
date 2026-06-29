import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/Layout'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import OccupancyPage from './pages/Occupancy'
import GuestsPage from './pages/Guests'
import StaysPage from './pages/Stays'
import FinancesPage from './pages/Finances'
import LeadsPage from './pages/Leads'
import OnboardingPage from './pages/Onboarding'
import BlacklistPage from './pages/Blacklist'
import NotificationsPage from './pages/Notifications'
import CottagePage from './pages/Cottage'
import StaffPage from './pages/Staff'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const loadUser = useAuthStore(s => s.loadUser)

  useEffect(() => {
    loadUser()
  }, [loadUser])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="occupancy" element={<OccupancyPage />} />
          <Route path="guests" element={<GuestsPage />} />
          <Route path="stays" element={<StaysPage />} />
          <Route path="finances" element={<FinancesPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="blacklist" element={<BlacklistPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="cottage" element={<CottagePage />} />
          <Route path="staff" element={<StaffPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
