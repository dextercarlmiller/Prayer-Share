-- ============================================================
-- PrayerShare — Full Schema + RLS Policies
-- Run this in your Supabase SQL editor to set up the database.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles: extends auth.users (one-to-one)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prayer groups
CREATE TABLE IF NOT EXISTS public.prayer_groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group membership
CREATE TABLE IF NOT EXISTS public.group_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id  UUID NOT NULL REFERENCES public.prayer_groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- Prayer requests (personal and group-shared)
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

-- Group invitations
CREATE TABLE IF NOT EXISTS public.group_invites (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id       UUID NOT NULL REFERENCES public.prayer_groups(id) ON DELETE CASCADE,
  invited_email  TEXT NOT NULL,
  invited_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token          TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prayed-for events: one record per user per request per day
CREATE TABLE IF NOT EXISTS public.prayed_for_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (request_id, user_id, date)
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  request_id UUID REFERENCES public.prayer_requests(id) ON DELETE SET NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on new user signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Notify group members when a prayer is marked answered
CREATE OR REPLACE FUNCTION public.notify_prayer_answered()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req_title TEXT;
  member_id UUID;
BEGIN
  -- Only fire when is_answered changes to true
  IF NEW.is_answered = TRUE AND OLD.is_answered = FALSE AND NEW.group_id IS NOT NULL THEN
    SELECT title INTO req_title FROM public.prayer_requests WHERE id = NEW.id;

    FOR member_id IN
      SELECT gm.user_id
      FROM public.group_members gm
      WHERE gm.group_id = NEW.group_id
        AND gm.user_id != NEW.user_id
        AND EXISTS (
          SELECT 1 FROM public.prayed_for_events pfe
          WHERE pfe.request_id = NEW.id AND pfe.user_id = gm.user_id
        )
    LOOP
      INSERT INTO public.notifications (user_id, message, request_id)
      VALUES (member_id, 'A prayer you prayed for was answered: "' || req_title || '"', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_prayer_answered ON public.prayer_requests;
CREATE TRIGGER on_prayer_answered
  AFTER UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE PROCEDURE public.notify_prayer_answered();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayed_for_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: readable by self and fellow group members; writable by self only
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  id = auth.uid()
  OR id IN (
    SELECT gm2.user_id FROM public.group_members gm2
    WHERE gm2.group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Prayer groups: readable by members; insertable by any authed user
CREATE POLICY "prayer_groups_select" ON public.prayer_groups FOR SELECT USING (
  id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);
CREATE POLICY "prayer_groups_insert" ON public.prayer_groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "prayer_groups_update" ON public.prayer_groups FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "prayer_groups_delete" ON public.prayer_groups FOR DELETE USING (created_by = auth.uid());

-- Group members: readable by fellow members; admins can delete
CREATE POLICY "group_members_select" ON public.group_members FOR SELECT USING (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE USING (
  user_id = auth.uid()
  OR group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Prayer requests: personal ones owned by user; group ones visible to members
CREATE POLICY "prayer_requests_select" ON public.prayer_requests FOR SELECT USING (
  user_id = auth.uid()
  OR (
    group_id IS NOT NULL
    AND group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  )
);
CREATE POLICY "prayer_requests_insert" ON public.prayer_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "prayer_requests_update" ON public.prayer_requests FOR UPDATE USING (
  user_id = auth.uid()
  OR (
    group_id IS NOT NULL
    AND group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  )
);
CREATE POLICY "prayer_requests_delete" ON public.prayer_requests FOR DELETE USING (
  user_id = auth.uid()
  OR (
    group_id IS NOT NULL
    AND group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- Group invites: created_by can read/write; anyone can read by token (for accept flow)
CREATE POLICY "group_invites_select" ON public.group_invites FOR SELECT USING (
  invited_by = auth.uid()
  OR group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  OR TRUE  -- allow reading by token for unauthenticated invite accept
);
CREATE POLICY "group_invites_insert" ON public.group_invites FOR INSERT WITH CHECK (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);
CREATE POLICY "group_invites_update" ON public.group_invites FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Prayed-for events: readable by any group member; writable only as yourself
CREATE POLICY "prayed_for_events_select" ON public.prayed_for_events FOR SELECT USING (
  user_id = auth.uid()
  OR request_id IN (
    SELECT id FROM public.prayer_requests
    WHERE user_id = auth.uid()
    OR (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
  )
);
CREATE POLICY "prayed_for_events_insert" ON public.prayed_for_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "prayed_for_events_delete" ON public.prayed_for_events FOR DELETE USING (user_id = auth.uid());

-- Notifications: private to each user
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- INDEXES
-- ============================================================

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
