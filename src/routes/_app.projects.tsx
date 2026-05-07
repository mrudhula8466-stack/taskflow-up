import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderKanban, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_app/projects")({ component: Projects });

interface Project { id: string; title: string; description: string | null; owner_id: string; created_at: string; }

const schema = z.object({
  title: z.string().trim().min(1, "Title required").max(120),
  description: z.string().trim().max(2000).optional(),
});

function Projects() {
  const { role } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const isAdmin = role === "admin";

  const load = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects((data ?? []) as Project[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setTitle(""); setDesc(""); setOpen(true); };
  const openEdit = (p: Project) => { setEditing(p); setTitle(p.title); setDesc(p.description ?? ""); setOpen(true); };

  const save = async () => {
    const parsed = schema.safeParse({ title, description: desc });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("projects").update({ title: parsed.data.title, description: parsed.data.description ?? null }).eq("id", editing.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Project updated");
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("projects").insert({ title: parsed.data.title, description: parsed.data.description ?? null, owner_id: u.user!.id });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Project created");
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this project and all its tasks?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">{isAdmin ? "Create and manage your team's projects." : "Projects you have access to."}</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1"/> New project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e)=>setTitle(e.target.value)}/></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={(e)=>setDesc(e.target.value)} rows={4}/></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving} className="bg-gradient-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
      ) : projects.length === 0 ? (
        <Card className="shadow-card"><CardContent className="py-16 text-center">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4"/>
          <p className="font-medium">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">{isAdmin ? "Create your first project to get started." : "Ask an admin to add you to a project."}</p>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Card key={p.id} className="shadow-card hover:shadow-elegant transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-primary-foreground"/>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={()=>openEdit(p)}><Pencil className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="icon" onClick={()=>remove(p.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-lg">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description || "No description"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
