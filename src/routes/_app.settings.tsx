import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { adminExists } from "@/server/team.functions";
import { claimInitialAdmin } from "@/server/roles.functions";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

const schema = z.object({ name: z.string().trim().min(1).max(100) });

function SettingsPage() {
  const { user, role, refreshRole } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
      setName(data?.name ?? "");
      try {
        const r = await adminExists();
        setHasAdmin(r.exists);
      } catch {
        setHasAdmin(true);
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    const parsed = schema.safeParse({ name });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name: parsed.data.name }).eq("id", user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  const claimAdmin = async () => {
    if (!user) return;
    try {
      await claimInitialAdmin();
      toast.success("You are now an admin");
      await refreshRole();
      setHasAdmin(true);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to claim admin");
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile.</p>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Email</Label><Input value={user?.email ?? ""} disabled/></div>
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={e=>setName(e.target.value)}/></div>
          <div className="space-y-2"><Label>Role</Label>
            <div><span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent text-accent-foreground text-sm capitalize">
              <Shield className="h-3 w-3"/> {role}
            </span></div>
          </div>
          <Button onClick={save} disabled={saving} className="bg-gradient-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      {role !== "admin" && hasAdmin === false && (
        <Card className="shadow-card border-primary/40">
          <CardHeader><CardTitle>Claim admin</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">No admin exists yet. As the first user, you can claim the admin role to start creating projects.</p>
            <Button onClick={claimAdmin} className="bg-gradient-primary">Become admin</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
