import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageLoader } from '../components/LoadingSpinner'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session ? '/my-list' : '/login', { replace: true })
    })
  }, [navigate])

  return <PageLoader />
}
