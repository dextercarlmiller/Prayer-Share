-- Migration 003: Allow multiple prayers per day + fix group creation RLS

-- 1. Remove the unique constraint so users can pray for the same request multiple times per day.
--    The constraint was: UNIQUE (request_id, user_id, date)
ALTER TABLE public.prayed_for_events
  DROP CONSTRAINT IF EXISTS prayed_for_events_request_id_user_id_date_key;

-- 2. Fix group creation: the old select policy only allowed members to see a group,
--    but INSERT...RETURNING runs before the creator is added to group_members, so
--    the returned row was filtered out and .single() failed with "0 rows".
--    Adding created_by = auth.uid() lets the creator see their group immediately.
DROP POLICY IF EXISTS "prayer_groups_select" ON public.prayer_groups;
CREATE POLICY "prayer_groups_select" ON public.prayer_groups FOR SELECT USING (
  created_by = auth.uid() OR id IN (SELECT public.get_my_group_ids())
);
