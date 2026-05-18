-- ============================================================
-- Migration 002: Add missing profile columns + fix recursive RLS
-- ============================================================

-- 1. Add first_name and email columns to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN first_name TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- 2. Create missing tables (no-ops if they already exist from schema.sql)
CREATE TABLE IF NOT EXISTS public.prayer_groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id  UUID NOT NULL REFERENCES public.prayer_groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES public.prayer_groups(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  details     TEXT,
  is_answered BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_invites (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id       UUID NOT NULL REFERENCES public.prayer_groups(id) ON DELETE CASCADE,
  invited_email  TEXT NOT NULL,
  invited_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token          TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prayed_for_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (request_id, user_id, date)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  request_id UUID REFERENCES public.prayer_requests(id) ON DELETE SET NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Security-definer helper: returns group IDs the current user belongs to.
--    SECURITY DEFINER bypasses RLS on group_members, breaking the recursion.
CREATE OR REPLACE FUNCTION public.get_my_group_ids()
RETURNS SETOF UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
$$;

-- 4. Enable RLS on new tables
ALTER TABLE public.prayer_groups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayed_for_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;

-- 5. Drop old profile policies and recreate (profiles now uses get_my_group_ids)
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_write"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"      ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  id = auth.uid()
  OR id IN (
    SELECT gm.user_id FROM public.group_members gm
    WHERE gm.group_id IN (SELECT public.get_my_group_ids())
  )
);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- 6. Drop and recreate group_members policies using get_my_group_ids()
--    to eliminate the self-referential recursion.
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete" ON public.group_members;

CREATE POLICY "group_members_select" ON public.group_members FOR SELECT USING (
  group_id IN (SELECT public.get_my_group_ids())
);
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE USING (
  user_id = auth.uid()
  OR group_id IN (SELECT public.get_my_group_ids())
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_members.group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
);

-- 7. Remaining table policies
DROP POLICY IF EXISTS "prayer_groups_select" ON public.prayer_groups;
DROP POLICY IF EXISTS "prayer_groups_insert" ON public.prayer_groups;
DROP POLICY IF EXISTS "prayer_groups_update" ON public.prayer_groups;
DROP POLICY IF EXISTS "prayer_groups_delete" ON public.prayer_groups;

CREATE POLICY "prayer_groups_select" ON public.prayer_groups FOR SELECT USING (
  id IN (SELECT public.get_my_group_ids())
);
CREATE POLICY "prayer_groups_insert" ON public.prayer_groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "prayer_groups_update" ON public.prayer_groups FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "prayer_groups_delete" ON public.prayer_groups FOR DELETE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "prayer_requests_select" ON public.prayer_requests;
DROP POLICY IF EXISTS "prayer_requests_insert" ON public.prayer_requests;
DROP POLICY IF EXISTS "prayer_requests_update" ON public.prayer_requests;
DROP POLICY IF EXISTS "prayer_requests_delete" ON public.prayer_requests;

CREATE POLICY "prayer_requests_select" ON public.prayer_requests FOR SELECT USING (
  user_id = auth.uid()
  OR (group_id IS NOT NULL AND group_id IN (SELECT public.get_my_group_ids()))
);
CREATE POLICY "prayer_requests_insert" ON public.prayer_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "prayer_requests_update" ON public.prayer_requests FOR UPDATE USING (
  user_id = auth.uid()
  OR (group_id IS NOT NULL AND group_id IN (SELECT public.get_my_group_ids()))
);
CREATE POLICY "prayer_requests_delete" ON public.prayer_requests FOR DELETE USING (
  user_id = auth.uid()
  OR (
    group_id IS NOT NULL
    AND group_id IN (SELECT public.get_my_group_ids())
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = prayer_requests.group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "group_invites_select" ON public.group_invites;
DROP POLICY IF EXISTS "group_invites_insert" ON public.group_invites;
DROP POLICY IF EXISTS "group_invites_update" ON public.group_invites;

CREATE POLICY "group_invites_select" ON public.group_invites FOR SELECT USING (
  invited_by = auth.uid()
  OR group_id IN (SELECT public.get_my_group_ids())
  OR TRUE  -- allow reading by token for unauthenticated invite accept
);
CREATE POLICY "group_invites_insert" ON public.group_invites FOR INSERT WITH CHECK (
  group_id IN (SELECT public.get_my_group_ids())
);
CREATE POLICY "group_invites_update" ON public.group_invites FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "prayed_for_events_select" ON public.prayed_for_events;
DROP POLICY IF EXISTS "prayed_for_events_insert" ON public.prayed_for_events;
DROP POLICY IF EXISTS "prayed_for_events_delete" ON public.prayed_for_events;

CREATE POLICY "prayed_for_events_select" ON public.prayed_for_events FOR SELECT USING (
  user_id = auth.uid()
  OR request_id IN (
    SELECT id FROM public.prayer_requests
    WHERE user_id = auth.uid()
    OR (group_id IN (SELECT public.get_my_group_ids()))
  )
);
CREATE POLICY "prayed_for_events_insert" ON public.prayed_for_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "prayed_for_events_delete" ON public.prayed_for_events FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE USING (user_id = auth.uid());

-- 8. Update handle_new_user trigger to populate first_name and email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 9. Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_id   ON public.prayer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_group_id  ON public.prayer_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_answered  ON public.prayer_requests(is_answered);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_archived  ON public.prayer_requests(is_archived);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_created   ON public.prayer_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id     ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id    ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_prayed_for_events_request ON public.prayed_for_events(request_id);
CREATE INDEX IF NOT EXISTS idx_prayed_for_events_user    ON public.prayed_for_events(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_token       ON public.group_invites(token);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id     ON public.notifications(user_id, is_read);
