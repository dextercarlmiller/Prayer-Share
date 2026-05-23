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
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id          UUID        REFERENCES public.prayer_groups(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  details           TEXT,
  details_encrypted TEXT,
  is_answered       BOOLEAN     NOT NULL DEFAULT FALSE,
  answered_at       TIMESTAMPTZ,
  is_archived       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group invitations
CREATE TABLE IF NOT EXISTS public.group_invites (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id       UUID        NOT NULL REFERENCES public.prayer_groups(id) ON DELETE CASCADE,
  invited_email  TEXT        NOT NULL,
  invited_by     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token          TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted       BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log: append-only record of sensitive mutations
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action     TEXT        NOT NULL,
  table_name TEXT        NOT NULL,
  record_id  UUID,
  old_data   JSONB,
  new_data   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prayed-for events: one record per prayer action (multiple per day allowed)
CREATE TABLE IF NOT EXISTS public.prayed_for_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE
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

-- Encrypt prayer details on insert/update when app.encryption_key is configured
CREATE OR REPLACE FUNCTION public.encrypt_prayer_details_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  enc_key TEXT := current_setting('app.encryption_key', true);
BEGIN
  IF enc_key IS NOT NULL AND enc_key <> '' AND NEW.details IS NOT NULL THEN
    NEW.details_encrypted := encode(pgp_sym_encrypt(NEW.details, enc_key), 'base64');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_prayer_details ON public.prayer_requests;
CREATE TRIGGER encrypt_prayer_details
  BEFORE INSERT OR UPDATE OF details ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_prayer_details_trigger();

-- Audit logging for sensitive tables
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (actor_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (actor_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_group_members  ON public.group_members;
DROP TRIGGER IF EXISTS audit_group_invites  ON public.group_invites;
DROP TRIGGER IF EXISTS audit_prayer_groups  ON public.prayer_groups;

CREATE TRIGGER audit_group_members
  AFTER INSERT OR UPDATE OR DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_group_invites
  AFTER INSERT OR UPDATE OR DELETE ON public.group_invites
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_prayer_groups
  AFTER INSERT OR UPDATE OR DELETE ON public.prayer_groups
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

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
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log: actors may only read their own entries
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT USING (actor_id = auth.uid());

-- Helper: returns group IDs for the current user without triggering RLS on group_members.
-- SECURITY DEFINER is required to break the self-referential recursion that would occur
-- if group_members policies queried group_members directly.
CREATE OR REPLACE FUNCTION public.get_my_group_ids()
RETURNS SETOF UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
$$;

-- Profiles: readable by self and fellow group members; writable by self only
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  id = auth.uid()
  OR id IN (
    SELECT gm.user_id FROM public.group_members gm
    WHERE gm.group_id IN (SELECT public.get_my_group_ids())
  )
);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Prayer groups: readable by creator or members; insertable by any authed user
CREATE POLICY "prayer_groups_select" ON public.prayer_groups FOR SELECT USING (
  created_by = auth.uid() OR id IN (SELECT public.get_my_group_ids())
);
CREATE POLICY "prayer_groups_insert" ON public.prayer_groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "prayer_groups_update" ON public.prayer_groups FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "prayer_groups_delete" ON public.prayer_groups FOR DELETE USING (created_by = auth.uid());

-- Group members: readable by fellow members; admins can delete.
-- Uses get_my_group_ids() to avoid infinite recursion (policy cannot query itself).
CREATE POLICY "group_members_select" ON public.group_members FOR SELECT USING (
  group_id IN (SELECT public.get_my_group_ids())
);
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE USING (
  user_id = auth.uid()
  OR (
    group_id IN (SELECT public.get_my_group_ids())
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_members.group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  )
);

-- Prayer requests: personal ones owned by user; group ones visible to members
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

-- Group invites: inviter and group members may list; token-based accept goes through RPC
CREATE POLICY "group_invites_select" ON public.group_invites FOR SELECT USING (
  invited_by = auth.uid()
  OR group_id IN (SELECT public.get_my_group_ids())
);
CREATE POLICY "group_invites_insert" ON public.group_invites FOR INSERT WITH CHECK (
  group_id IN (SELECT public.get_my_group_ids())
);
-- No direct UPDATE policy: accept_invite_by_token() SECURITY DEFINER handles all updates

-- Prayed-for events: readable by any group member; writable only as yourself
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

-- Notifications: private to each user
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- SECURE RPC FUNCTIONS
-- ============================================================

-- Validates an invite token server-side and atomically joins the group.
-- SECURITY DEFINER bypasses RLS so token lookup works without OR TRUE on the table policy.
CREATE OR REPLACE FUNCTION public.accept_invite_by_token(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite  public.group_invites%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_name    TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invite
  FROM public.group_invites
  WHERE token = p_token AND accepted = FALSE AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired');
  END IF;

  SELECT name INTO v_name FROM public.prayer_groups WHERE id = v_invite.group_id;

  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = v_invite.group_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('status', 'already_member', 'group_name', v_name);
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_invite.group_id, v_user_id, 'member');

  UPDATE public.group_invites SET accepted = TRUE WHERE id = v_invite.id;

  RETURN jsonb_build_object('status', 'joined', 'group_name', v_name, 'group_id', v_invite.group_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite_by_token(TEXT) TO authenticated;

-- SECURITY DEFINER encrypt/decrypt helpers — key never leaves the server.
-- Set the key first: ALTER DATABASE postgres SET app.encryption_key = '<hex key>';
CREATE OR REPLACE FUNCTION public.encrypt_text(plaintext TEXT)
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT encode(pgp_sym_encrypt(plaintext, current_setting('app.encryption_key', true)), 'base64')
$$;

CREATE OR REPLACE FUNCTION public.decrypt_text(ciphertext TEXT)
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT pgp_sym_decrypt(decode(ciphertext, 'base64'), current_setting('app.encryption_key', true))
$$;

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
CREATE INDEX IF NOT EXISTS idx_group_invites_expires_at  ON public.group_invites(expires_at) WHERE accepted = FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_log_actor           ON public.audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table           ON public.audit_log(table_name, record_id);
