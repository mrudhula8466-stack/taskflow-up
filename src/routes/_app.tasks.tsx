import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, Trash2, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { format, isPast } from "date-fns";

export const Route = createFileRoute("/_app/tasks")({ component: TasksPage });

interface Task {
  id: string; title: string; description: string|null;
  status: "pending"|"in_progress"|"completed";
  priority: "low"|"medium"|"high";
  due_date: string|null; assigned_to: string|null; project_id: string; created_at: string;
}
interface Project { id: string; title: string; }
interface Profile { id: string; name: string; }

const schema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional(),
  project_id: z.string().uuid("Pick a project"),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(["low","medium","high"]),
  due_date: z.string().optional(),
});

function TasksPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // form
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<"low"|"medium"|"high">("medium");
  const [dueDate, setDueDate] = useState("");

  const load = async () => {
    const [t, p, pr] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("id,title"),
      supabase.from("profiles").select("id,name"),
    ]);
    setTasks((t.data ?? []) as Task[]);
    setProjects((p.data ?? []) as Project[]);
    setProfiles((pr.data ?? []) as Profile[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p.name])), [profiles]);
  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.title])), [projects]);

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all") {
      if (filterStatus === "overdue") {
        if (!(t.due_date && isPast(new Date(t.due_date)) && t.status !== "completed")) return false;
      } else if (t.status !== filterStatus) return false;
    }
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const openNew = () => {
    setTitle(""); setDesc(""); setProjectId(""); setAssignee(""); setPriority("medium"); setDueDate("");
    setOpen(true);
  };

  const create = async () => {
    const parsed = schema.safeParse({ title, description: desc, project_id: projectId, assigned_to: assignee, priority, due_date: dueDate });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      project_id: parsed.data.project_id,
      assigned_to: parsed.data.assigned_to || null,
      priority: parsed.data.priority,
      due_date: parsed.data.due_date || null,
      created_by: user!.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Task created");
    setOpen(false);
    load();
  };

  const updateStatus = async (id: string, status: Task["status"]) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const priorityColor = (p: string) => p === "high" ? "destructive" : p === "medium" ? "default" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">Track work across all your projects.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1"/> New task</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={e=>setTitle(e.target.value)}/></div>
                <div className="space-y-1.5"><Label>Description</Label><Textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Project</Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Assignee</Label>
                    <Select value={assignee} onValueChange={setAssignee}>
                      <SelectTrigger><SelectValue placeholder="Unassigned"/></SelectTrigger>
                      <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name || "Unnamed"}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Priority</Label>
                    <Select value={priority} onValueChange={(v: "low"|"medium"|"high") => setPriority(v)}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button onClick={create} disabled={saving} className="bg-gradient-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks..." className="pl-9"/>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[160px]"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card"><CardContent className="py-16 text-center">
          <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4"/>
          <p className="font-medium">No tasks found</p>
          <p className="text-sm text-muted-foreground mt-1">Adjust filters or create a new task.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => {
            const overdue = t.due_date && isPast(new Date(t.due_date)) && t.status !== "completed";
            const canUpdate = isAdmin || t.assigned_to === user?.id;
            return (
              <Card key={t.id} className="shadow-card hover:shadow-elegant transition-shadow">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                      <span>{projectMap.get(t.project_id)}</span>
                      <span>·</span>
                      <span>{t.assigned_to ? profileMap.get(t.assigned_to) ?? "Unknown" : "Unassigned"}</span>
                      {t.due_date && (<><span>·</span><span className={overdue ? "text-destructive font-medium" : ""}>Due {format(new Date(t.due_date), "MMM d")}</span></>)}
                    </div>
                  </div>
                  <Badge variant={priorityColor(t.priority) as "default"|"secondary"|"destructive"} className="capitalize">{t.priority}</Badge>
                  {canUpdate ? (
                    <Select value={overdue ? "pending" : t.status} onValueChange={(v: Task["status"]) => updateStatus(t.id, v)}>
                      <SelectTrigger className="w-[140px]"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : <Badge variant="outline" className="capitalize">{t.status.replace("_"," ")}</Badge>}
                  {isAdmin && <Button variant="ghost" size="icon" onClick={()=>remove(t.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
