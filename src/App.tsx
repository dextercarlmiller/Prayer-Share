import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthContext } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'

import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { ResetPassword } from './pages/ResetPassword'
import { AuthCallback } from './pages/AuthCallback'
import { MyList } from './pages/MyList'
import { Groups } from './pages/Groups'
import { NewGroup } from './pages/NewGroup'
import { GroupView } from './pages/GroupView'
import { GroupSettings } from './pages/GroupSettings'
import { InviteAccept } from './pages/InviteAccept'
import { Account } from './pages/Account'

function AppRoutes() {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="/" element={auth.session ? <Navigate to="/my-list" replace /> : <Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/invite/:token" element={<InviteAccept />} />

        <Route path="/my-list" element={<ProtectedRoute><MyList /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
        <Route path="/groups/new" element={<ProtectedRoute><NewGroup /></ProtectedRoute>} />
        <Route path="/groups/:id" element={<ProtectedRoute><GroupView /></ProtectedRoute>} />
        <Route path="/groups/:id/settings" element={<ProtectedRoute><GroupSettings /></ProtectedRoute>} />
        <Route path="/answered" element={<Navigate to="/account" replace />} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
