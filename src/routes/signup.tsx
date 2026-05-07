import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

function SignupPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { name: parsed.data.name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created!");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-subtle">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-primary text-primary-foreground">
        <div className="text-2xl font-bold">Tasksy</div>
        <div className="space-y-6">
          <h1 className="text-5xl font-bold leading-tight">Start your<br/>workspace.</h1>
          <p className="text-lg opacity-90 max-w-md">Free to start. Invite your team. Ship outcomes.</p>
        </div>
        <div className="text-sm opacity-70">© 2026 Tasksy</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>You'll join as an admin and can start creating projects right away.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Full name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} required/></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required/></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required/></div>
              <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Create account"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
