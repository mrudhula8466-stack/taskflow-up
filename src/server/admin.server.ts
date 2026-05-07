// Server-only re-export of the admin Supabase client.
// Keeping this in a *.server.ts file lets *.functions.ts import it without
// tripping the import-protection plugin.
export { supabaseAdmin } from "@/integrations/supabase/client.server";
