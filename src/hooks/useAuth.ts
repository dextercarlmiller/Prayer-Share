import { useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  profileError: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    profileError: null,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(s => ({ ...s, session, user: session?.user ?? null }))
      if (session?.user) loadProfile(session.user.id)
      else setState(s => ({ ...s, loading: false }))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(s => ({ ...s, session, user: session?.user ?? null, profileError: null }))
      if (session?.user) loadProfile(session.user.id)
      else setState(s => ({ ...s, profile: null, loading: false }))
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setState(s => ({ ...s, profile: data, loading: false, profileError: null }))
      return
    }

    // Profile missing (trigger may not have run) — create it now
    if (error?.code === 'PGRST116') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: created, error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            first_name: (user.user_metadata?.first_name as string) ?? '',
            email: user.email ?? '',
          })
          .select()
          .single()
        if (upsertError) {
          setState(s => ({
            ...s,
            profile: null,
            loading: false,
            profileError: 'Database not set up. Run supabase/schema.sql in your Supabase SQL Editor.',
          }))
          return
        }
        setState(s => ({ ...s, profile: created, loading: false, profileError: null }))
        return
      }
    }

    // Table doesn't exist or another DB error
    const dbError = error?.code === '42P01'
      ? 'Database not set up. Run supabase/schema.sql in your Supabase SQL Editor.'
      : (error?.message ?? null)
    setState(s => ({ ...s, profile: null, loading: false, profileError: dbError }))
  }

  async function signUp(email: string, password: string, firstName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  async function updateProfile(updates: Partial<Pick<Profile, 'first_name'>>) {
    if (!state.user) return { error: new Error('Not signed in') }
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', state.user.id)
    if (!error) setState(s => ({ ...s, profile: s.profile ? { ...s.profile, ...updates } : s.profile }))
    return { error }
  }

  return { ...state, signUp, signIn, signOut, resetPassword, updateProfile }
}
