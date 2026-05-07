
-- Restrict role visibility: users can only see their own roles
DROP POLICY IF EXISTS "anyone authed can read roles" ON public.user_roles;
CREATE POLICY "users read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Remove admin-managed role escalation path. Role assignment must go through
-- service role (server-side trusted code) only.
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;

-- Fix mutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;
