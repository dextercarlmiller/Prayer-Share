import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { GroupInvite, GroupMember, PrayerGroup } from '../types'

export function useGroups() {
  const [groups, setGroups] = useState<PrayerGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: memberRows, error: err } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)

      if (err) throw err
      if (!memberRows || memberRows.length === 0) {
        setGroups([])
        return
      }

      const groupIds = memberRows.map(r => r.group_id)

      const { data: groupData, error: gErr } = await supabase
        .from('prayer_groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false })

      if (gErr) throw gErr

      // Get member counts and latest request dates
      const enriched = await Promise.all(
        (groupData ?? []).map(async (g: PrayerGroup) => {
          const [countRes, latestRes] = await Promise.all([
            supabase.from('group_members').select('id', { count: 'exact' }).eq('group_id', g.id),
            supabase
              .from('prayer_requests')
              .select('created_at')
              .eq('group_id', g.id)
              .eq('is_archived', false)
              .order('created_at', { ascending: false })
              .limit(1),
          ])
          return {
            ...g,
            member_count: countRes.count ?? 0,
            latest_request_at: latestRes.data?.[0]?.created_at ?? null,
          }
        })
      )

      setGroups(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function createGroup(name: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in'), group: null }

    const { data: group, error } = await supabase
      .from('prayer_groups')
      .insert({ name, created_by: user.id })
      .select()
      .single()

    if (error) return { error, group: null }

    // Creator becomes admin member
    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'admin',
    })

    if (memberError) return { error: memberError, group: null }

    await fetch()
    return { error: null, group }
  }

  async function inviteMember(groupId: string, email: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in') }

    const { error } = await supabase.from('group_invites').insert({
      group_id: groupId,
      invited_email: email.trim().toLowerCase(),
      invited_by: user.id,
    })
    return { error }
  }

  async function removeMember(groupId: string, userId: string) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)
    if (!error) await fetch()
    return { error }
  }

  async function leaveGroup(groupId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in') }
    return removeMember(groupId, user.id)
  }

  return { groups, loading, error, refetch: fetch, createGroup, inviteMember, removeMember, leaveGroup }
}

export function useGroupMembers(groupId: string) {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('group_members')
      .select('*, profiles:user_id (id, first_name, email)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    setMembers((data as GroupMember[]) ?? [])
    setError(err?.message ?? null)
    setLoading(false)
  }, [groupId])

  useEffect(() => { fetch() }, [fetch])
  return { members, loading, error, refetch: fetch }
}

export function useGroupInvites(groupId: string) {
  const [invites, setInvites] = useState<GroupInvite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    supabase
      .from('group_invites')
      .select('*')
      .eq('group_id', groupId)
      .eq('accepted', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvites((data as GroupInvite[]) ?? [])
        setLoading(false)
      })
  }, [groupId])

  return { invites, loading }
}

export function useGroupRole(groupId: string) {
  const [role, setRole] = useState<'admin' | 'member' | null>(null)

  useEffect(() => {
    if (!groupId) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => setRole(data?.role ?? null))
    })
  }, [groupId])

  return role
}
