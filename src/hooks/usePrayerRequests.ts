import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PrayerRequest, PrayerStatus } from '../types'

interface UsePrayerRequestsOptions {
  groupId?: string
  answered?: boolean
  archived?: boolean
}

export function usePrayerRequests(options: UsePrayerRequestsOptions = {}) {
  const [requests, setRequests] = useState<PrayerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const today = new Date().toISOString().split('T')[0]

      let query = supabase
        .from('prayer_requests')
        .select('*, profiles:user_id (id, first_name)')

      if (options.groupId) {
        query = query.eq('group_id', options.groupId)
      } else {
        query = query.eq('user_id', user.id).is('group_id', null)
      }

      if (options.answered) {
        query = query.eq('is_answered', true).eq('is_archived', false)
      } else if (options.archived) {
        query = query.eq('is_archived', true)
      } else {
        query = query.eq('is_answered', false).eq('is_archived', false)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError

      const rows = (data ?? []) as PrayerRequest[]
      if (rows.length === 0) {
        setRequests([])
        setLoading(false)
        return
      }

      const ids = rows.map(r => r.id)

      // Check prayer_interactions for today's activity (new system)
      const todayInteractionsRes = await supabase
        .from('prayer_interactions')
        .select('prayer_id')
        .in('prayer_id', ids)
        .eq('user_id', user.id)
        .eq('prayed_date', today)

      const todaySet = new Set((todayInteractionsRes.data ?? []).map(r => r.prayer_id))

      const enriched: PrayerRequest[] = rows.map(r => ({
        ...r,
        // pray_count comes directly from the prayer_requests column (maintained by trigger)
        prayed_for_count: r.pray_count ?? 0,
        user_has_prayed_today: todaySet.has(r.id),
      }))

      setRequests(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [options.groupId, options.answered, options.archived])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function addRequest(title: string, details: string | null, groupId?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in') }

    const { error } = await supabase.from('prayer_requests').insert({
      user_id: user.id,
      group_id: groupId ?? null,
      title,
      details: details || null,
    })
    if (!error) await fetch()
    return { error }
  }

  async function markAnswered(id: string) {
    const { error } = await supabase
      .from('prayer_requests')
      .update({ is_answered: true, answered_at: new Date().toISOString(), status: 'answered' })
      .eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  async function updateStatus(id: string, status: PrayerStatus, answeredNote?: string) {
    const updates: Record<string, unknown> = { status }
    if (status === 'answered') {
      updates.is_answered = true
      updates.answered_at = new Date().toISOString()
      if (answeredNote) updates.answered_note = answeredNote
    }

    const { error } = await supabase
      .from('prayer_requests')
      .update(updates)
      .eq('id', id)

    if (!error) {
      setRequests(prev =>
        prev.map(r =>
          r.id === id
            ? {
                ...r,
                status,
                ...(status === 'answered' ? {
                  is_answered: true,
                  answered_at: new Date().toISOString(),
                  answered_note: answeredNote ?? r.answered_note,
                } : {}),
              }
            : r
        )
      )
    }

    return { error }
  }

  async function archiveRequest(id: string) {
    const { error } = await supabase
      .from('prayer_requests')
      .update({ is_archived: true })
      .eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  async function prayFor(requestId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in') }

    const today = new Date().toISOString().split('T')[0]

    // Optimistic update first
    setRequests(prev =>
      prev.map(r =>
        r.id === requestId
          ? {
              ...r,
              pray_count: (r.pray_count ?? 0) + 1,
              prayed_for_count: (r.prayed_for_count ?? 0) + 1,
              user_has_prayed_today: true,
            }
          : r
      )
    )

    // Insert into prayer_interactions (trigger increments pray_count in DB)
    const { error } = await supabase.from('prayer_interactions').insert({
      prayer_id: requestId,
      user_id: user.id,
      prayed_date: today,
    })

    // If insert failed (e.g. already prayed today), revert optimistic update
    if (error) {
      setRequests(prev =>
        prev.map(r =>
          r.id === requestId
            ? {
                ...r,
                pray_count: Math.max(0, (r.pray_count ?? 0) - 1),
                prayed_for_count: Math.max(0, (r.prayed_for_count ?? 0) - 1),
                user_has_prayed_today: false,
              }
            : r
        )
      )
    }

    return { error }
  }

  return {
    requests,
    loading,
    error,
    refetch: fetch,
    addRequest,
    markAnswered,
    updateStatus,
    archiveRequest,
    prayFor,
  }
}
