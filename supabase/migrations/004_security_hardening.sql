-- ============================================================
-- Migration 004: Security Hardening
-- Fixes:
--   1. Remove OR TRUE from group_invites RLS (invite token enumeration)
--   2. Add expires_at to group_invites (token expiration)
--   3. Accept-invite-by-token RPC (SECURITY DEFINER, no table exposure)
--   4. Audit logging for sensitive tables
--   5. Prayer detail encryption infrastructure (pgcrypto)
-- ============================================================


-- ============================================================
-- 1. INVITE TOKEN EXPIRATION
-- ============================================================

ALTER TABLE public.group_invites
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days');

CREATE INDEX IF NOT EXISTS idx_group_invites_expires_at
  ON public.group_invites(expires_at)
  WHERE accepted = FALSE;


-- ============================================================
-- 2. FIX GROUP INVITES RLS: remove OR TRUE
-- ============================================================

DROP POLICY IF EXISTS "group_invites_select" ON public.group_invites;
DROP POLICY IF EXISTS "group_invites_update" ON public.group_invites;

-- Only the inviter and existing group members may list pending invites.
-- Token-based lookups for the accept flow go through accept_invite_by_token() below.
CREATE POLICY "group_invites_select" ON public.group_invites FOR SELECT USING (
  invited_by = auth.uid()
  OR group_id IN (SELECT public.get_my_group_ids())
);
-- No direct UPDATE policy — updates are performed exclusively via the
-- SECURITY DEFINER accept_invite_by_token() function.


-- ============================================================
-- 3. ACCEPT-INVITE RPC (SECURITY DEFINER)
-- ============================================================
-- This is the sole path for a user to consume an invite token.
-- SECURITY DEFINER means it runs as the function owner and can
-- bypass RLS to read and update group_invites safely, without
-- exposing the full table to the caller.

CREATE OR REPLACE FUNCTION public.accept_invite_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  WHERE token     = p_token
    AND accepted  = FALSE
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired');
  END IF;

  SELECT name INTO v_name
  FROM public.prayer_groups
  WHERE id = v_invite.group_id;

  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = v_invite.group_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('status', 'already_member', 'group_name', v_name);
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_invite.group_id, v_user_id, 'member');

  UPDATE public.group_invites
  SET accepted = TRUE
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('status', 'joined', 'group_name', v_name, 'group_id', v_invite.group_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite_by_token(TEXT) TO authenticated;


-- ============================================================
-- 4. AUDIT LOGGING
-- ============================================================

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

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Actors may only read their own audit entries
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT USING (actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON public.audit_log(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_table
  ON public.audit_log(table_name, record_id);

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

CREATE OR REPLACE TRIGGER audit_group_members
  AFTER INSERT OR UPDATE OR DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_group_invites
  AFTER INSERT OR UPDATE OR DELETE ON public.group_invites
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE TRIGGER audit_prayer_groups
  AFTER INSERT OR UPDATE OR DELETE ON public.prayer_groups
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


-- ============================================================
-- 5. PRAYER DETAIL ENCRYPTION INFRASTRUCTURE
-- ============================================================
-- Before applying this migration, set the encryption key as a
-- superuser in the Supabase SQL editor:
--
--   SELECT set_config('app.encryption_key',
--     encode(gen_random_bytes(32), 'hex'), false);
--   ALTER DATABASE postgres
--     SET app.encryption_key = '<paste generated key here>';
--
-- The SECURITY DEFINER wrappers below keep the key server-side;
-- it is never transmitted to the client.

CREATE OR REPLACE FUNCTION public.encrypt_text(plaintext TEXT)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT encode(
    pgp_sym_encrypt(plaintext, current_setting('app.encryption_key', true)),
    'base64'
  )
$$;

CREATE OR REPLACE FUNCTION public.decrypt_text(ciphertext TEXT)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT pgp_sym_decrypt(
    decode(ciphertext, 'base64'),
    current_setting('app.encryption_key', true)
  )
$$;

-- Parallel encrypted column; existing plaintext column kept during migration period.
-- Once app.encryption_key is configured and all rows back-filled, null out `details`.
ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS details_encrypted TEXT;

-- Auto-encrypt details on every INSERT/UPDATE when the key is present
CREATE OR REPLACE FUNCTION public.encrypt_prayer_details_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key TEXT := current_setting('app.encryption_key', true);
BEGIN
  IF enc_key IS NOT NULL AND enc_key <> '' AND NEW.details IS NOT NULL THEN
    NEW.details_encrypted := encode(
      pgp_sym_encrypt(NEW.details, enc_key),
      'base64'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER encrypt_prayer_details
  BEFORE INSERT OR UPDATE OF details ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_prayer_details_trigger();
