import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, ListTodo, TrendingUp } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, isPast } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

interface Task {
  id: string; title: string; status: "pending"|"in_progress"|"completed";
  priority: "low"|"medium"|"high"; due_date: string | null; assigned_to: string | null;
  project_id: string; created_at: string;
}

function Dashboard() {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let q = supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (role === "member") q = q.eq("assigned_to", user.id);
      const { data } = await q;
      setTasks((data ?? []) as Task[]);
      setLoading(false);
    })();
  }, [user, role]);

  const overdue = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== "completed");
  const completed = tasks.filter(t => t.status === "completed");
  const pending = tasks.filter(t => t.status === "pending");
  const inProgress = tasks.filter(t => t.status === "in_progress");

  const stats = [
    { label: "Total tasks", value: tasks.length, icon: ListTodo, color: "from-primary to-primary-glow" },
    { label: "Completed", value: completed.length, icon: CheckCircle2, color: "from-success to-success" },
    { label: "Pending", value: pending.length + inProgress.length, icon: Clock, color: "from-warning to-warning" },
    { label: "Overdue", value: overdue.length, icon: AlertTriangle, color: "from-destructive to-destructive" },
  ];

  const priorityData = [
    { name: "High", value: tasks.filter(t => t.priority === "high").length, fill: "oklch(0.65 0.22 25)" },
    { name: "Medium", value: tasks.filter(t => t.priority === "medium").length, fill: "oklch(0.78 0.16 75)" },
    { name: "Low", value: tasks.filter(t => t.priority === "low").length, fill: "oklch(0.65 0.17 155)" },
  ].filter(d => d.value > 0);

  const statusData = [
    { name: "Pending", value: pending.length },
    { name: "In progress", value: inProgress.length },
    { name: "Completed", value: completed.length },
    { name: "Overdue", value: overdue.length },
  ];

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="shadow-card overflow-hidden relative">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</div>
                  <div className="text-3xl font-bold mt-1">{s.value}</div>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <s.icon className="h-5 w-5 text-white"/>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Tasks by status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <XAxis dataKey="name" stroke="oklch(0.6 0.02 265)" fontSize={12}/>
                  <YAxis stroke="oklch(0.6 0.02 265)" fontSize={12} allowDecimals={false}/>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}/>
                  <Bar dataKey="value" fill="oklch(0.7 0.2 285)" radius={[8,8,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle>By priority</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {priorityData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No tasks yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {priorityData.map((d,i) => <Cell key={i} fill={d.fill}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Recent tasks</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No tasks yet — head to Tasks to create one.</p>}
          {tasks.slice(0, 6).map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground">
                  {t.due_date ? `Due ${format(new Date(t.due_date), "MMM d")}` : "No due date"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={t.priority === "high" ? "destructive" : "secondary"} className="capitalize">{t.priority}</Badge>
                <Badge variant="outline" className="capitalize">{t.status.replace("_"," ")}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
