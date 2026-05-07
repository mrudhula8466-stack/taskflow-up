import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { LayoutDashboard, FolderKanban, CheckSquare, Users, Settings, LogOut, Moon, Sun, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/team", label: "Team", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => { await signOut(); nav({ to: "/login" }); };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 h-14">
        <div className="font-bold text-lg text-gradient">Tasksy</div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-20 h-screen w-64 border-r border-sidebar-border bg-sidebar flex flex-col transition-transform",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="text-2xl font-bold text-gradient">Tasksy</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = path === to || (to !== "/dashboard" && path.startsWith(to));
            return (
              <Link key={to} to={to} onClick={() => setOpen(false)} className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <Icon className="h-4 w-4"/> {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.email}</div>
              <div className="text-xs text-muted-foreground capitalize">{role ?? "—"}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1" onClick={toggle}>
              {theme === "dark" ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}
            </Button>
            <Button variant="ghost" size="sm" className="flex-1" onClick={handleLogout}>
              <LogOut className="h-4 w-4"/>
            </Button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-10 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
