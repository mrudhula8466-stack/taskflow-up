import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { listTeamMembers } from "@/server-fns/team.functions";
import { setAdminRole } from "@/server-fns/roles.functions";

export const Route = createFileRoute("/_app/team")({ component: TeamPage });

interface Member { id: string; name: string; created_at: string; roles: ("admin"|"member")[]; }

function TeamPage() {
  const { role, user, refreshRole } = useAuth();
  const isAdmin = role === "admin";
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await listTeamMembers();
      setMembers(data as Member[]);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load team");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const toggleAdmin = async (uid: string, isCurrentlyAdmin: boolean) => {
    if (uid === user?.id && isCurrentlyAdmin) {
      if (!confirm("Remove your own admin role?")) return;
    }
    try {
      await setAdminRole({ data: { targetUserId: uid, makeAdmin: !isCurrentlyAdmin } });
      toast.success("Role updated");
      if (uid === user?.id) await refreshRole();
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update role");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground mt-1">Everyone in your workspace.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => {
            const isMemberAdmin = m.roles.includes("admin");
            return (
              <Card key={m.id} className="shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
                      {(m.name || "?")[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{m.name || "Unnamed"}</div>
                      <Badge variant={isMemberAdmin ? "default" : "secondary"} className="mt-1 gap-1">
                        {isMemberAdmin ? <Shield className="h-3 w-3"/> : <UserIcon className="h-3 w-3"/>}
                        {isMemberAdmin ? "Admin" : "Member"}
                      </Badge>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button variant="outline" size="sm" className="w-full" onClick={()=>toggleAdmin(m.id, isMemberAdmin)}>
                      {isMemberAdmin ? "Demote to member" : "Promote to admin"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
