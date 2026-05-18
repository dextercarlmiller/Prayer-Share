import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PrayerRequest } from '../types'

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

      // Fetch all prayed_for events for these requests
      const [allEventsRes, todayEventsRes] = await Promise.all([
        supabase
          .from('prayed_for_events')
          .select('request_id')
          .in('request_id', ids),
        supabase
          .from('prayed_for_events')
          .select('request_id')
          .in('request_id', ids)
          .eq('user_id', user.id)
          .eq('date', today),
      ])

      const countMap: Record<string, number> = {}
      for (const row of allEventsRes.data ?? []) {
        countMap[row.request_id] = (countMap[row.request_id] ?? 0) + 1
      }

      const todaySet = new Set((todayEventsRes.data ?? []).map(r => r.request_id))

      const enriched: PrayerRequest[] = rows.map(r => ({
        ...r,
        prayed_for_count: countMap[r.id] ?? 0,
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
      .update({ is_answered: true, answered_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) await fetch()
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
    const { error } = await supabase.from('prayed_for_events').insert({
      request_id: requestId,
      user_id: user.id,
      date: today,
    })

    if (!error) {
      setRequests(prev =>
        prev.map(r =>
          r.id === requestId
            ? { ...r, prayed_for_count: (r.prayed_for_count ?? 0) + 1, user_has_prayed_today: true }
            : r
        )
      )
    }

    return { error }
  }

  return { requests, loading, error, refetch: fetch, addRequest, markAnswered, archiveRequest, prayFor }
}
