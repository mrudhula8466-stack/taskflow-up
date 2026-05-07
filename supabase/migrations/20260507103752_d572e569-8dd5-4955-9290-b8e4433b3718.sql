-- Ensure trigger fires on new signups to assign admin role
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Promote existing users (demo) to admin
INSERT INTO public.user_roles (user_id, role)
SELECT ur.user_id, 'admin'::app_role
FROM public.user_roles ur
WHERE ur.role = 'member'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id AND ur2.role = 'admin'
  );