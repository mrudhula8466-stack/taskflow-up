import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary"/>
    </div>
  );
  if (!user) return <Navigate to="/login"/>;
  return <AppShell><Outlet/></AppShell>;
}
