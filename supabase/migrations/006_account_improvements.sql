-- ============================================================
-- Migration 006: Account page improvements
-- Adds last_name to profiles; adds delete_user_account RPC
-- ============================================================

-- 1. Add last_name column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '';

-- 2. RPC: allows an authenticated user to delete their own account.
--    SECURITY DEFINER gives the function access to auth.users.
--    The cascades on profiles + child tables clean up all related data.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
