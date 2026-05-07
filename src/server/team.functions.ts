import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Returns all team members with their roles. Authenticated users only.
export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const [{ data: profs, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,name,created_at"),
      supabaseAdmin.from("user_roles").select("user_id,role"),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);
    return (profs ?? []).map((p) => ({
      ...p,
      roles: (roles ?? [])
        .filter((r) => r.user_id === p.id)
        .map((r) => r.role as "admin" | "member"),
    }));
  });

// Returns whether any admin already exists. Authenticated users only.
export const adminExists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { exists: (count ?? 0) > 0 };
  });
