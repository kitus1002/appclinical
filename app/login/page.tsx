"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap, Mail, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Auth logic
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error: " + error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 transform rotate-12">
                <Zap className="h-8 w-8 text-white -rotate-12" />
            </div>
            <h1 className="text-3xl font-bold font-montserrat tracking-tight mt-4">Bienvenido de nuevo</h1>
            <p className="text-muted-foreground">Accede a tu panel de control médico</p>
        </div>

        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>Usa tus credenciales para continuar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Correo Electrónico
                </label>
                <input 
                  type="email"
                  required
                  placeholder="ejemplo@clinica.com"
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Contraseña
                </label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full rounded-xl py-6 font-bold" disabled={loading}>
                {loading ? "Cargando..." : "Entrar al Dashboard"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50 text-center">
                <p className="text-sm text-muted-foreground">
                    ¿No tienes una cuenta?{" "}
                    <Link href="#" className="font-bold text-primary hover:underline">
                        Contactar Soporte
                    </Link>
                </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
             <Link href="/" className="text-muted-foreground text-sm hover:text-foreground flex items-center justify-center gap-2">
                <ArrowRight className="h-3 w-3 rotate-180" /> Volver a la web pública
             </Link>
        </div>
      </div>
    </div>
  );
}
