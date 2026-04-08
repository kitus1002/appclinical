"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LogOut, Settings, User, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export function UserNav() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const [userEmail, setUserEmail] = useState("");
  const [displayName, setDisplayName] = useState("Usuario");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");

      const { data: profile } = await supabase
        .from("perfiles")
        .select("nombre_completo")
        .eq("user_id", user.id)
        .single();

      const name = profile?.nombre_completo || user.email?.split("@")[0] || "Usuario";
      setDisplayName(name);
      setEditName(name);
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Limpiamos la caché del router y forzamos re-evaluación del middleware
    router.refresh();
    // Redirigimos a login para asegurar que no queden datos en pantalla
    router.push("/login");
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase
      .from("perfiles")
      .upsert({ user_id: user.id, nombre_completo: editName }, { onConflict: "user_id" });

    setDisplayName(editName);
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); setIsProfileOpen(false); }, 1200);
  };

  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 hover:bg-white/5 rounded-2xl px-3 py-2 transition-all focus:outline-none group">
            <div className="flex flex-col items-end">
              <p className="text-sm font-bold text-white leading-none">{displayName}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[140px]">{userEmail}</p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/20 border-2 border-blue-500/30 group-hover:scale-105 transition-all">
              {initials || <User className="h-4 w-4" />}
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-2">
            Mi Cuenta
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-800 my-1" />
          <DropdownMenuItem
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-all"
          >
            <div className="h-8 w-8 rounded-xl bg-slate-800 flex items-center justify-center">
              <Settings className="h-4 w-4 text-blue-400" />
            </div>
            Editar Perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-800 my-1" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-3 font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer transition-all"
          >
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <LogOut className="h-4 w-4" />
            </div>
            Cerrar Sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Profile Modal */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="bg-[#020617] border border-slate-800 rounded-[3rem] p-10 sm:max-w-md text-white">
          <DialogHeader className="space-y-4">
            <div className="h-16 w-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-600/20 mx-auto">
              {initials || <User className="h-7 w-7" />}
            </div>
            <DialogTitle className="text-3xl font-black uppercase tracking-tight text-center">Editar Perfil</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Nombre Completo</label>
              <input
                className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all shadow-inner text-lg"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Correo Electrónico</label>
              <input
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 text-slate-500 font-bold outline-none cursor-not-allowed shadow-inner"
                value={userEmail}
                disabled
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSaveProfile}
              disabled={saving || !editName.trim()}
              className="w-full bg-white text-slate-950 rounded-full py-8 font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-2xl"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : saved ? (
                <Check className="h-5 w-5 mr-2 text-emerald-600" />
              ) : null}
              {saved ? "¡Guardado!" : saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
