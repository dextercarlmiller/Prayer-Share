import { createContext, useContext } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { Profile } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  profileError: string | null
  signUp: (email: string, password: string, firstName: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updateProfile: (updates: Partial<Pick<Profile, 'first_name'>>) => Promise<{ error: Error | null }>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthContext.Provider')
  return ctx
}
