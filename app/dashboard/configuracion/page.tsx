"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Save, 
  Upload,
  Image as ImageIcon,
  Loader2,
  Building2,
  ShieldCheck
} from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>({
    nombre_completo: "",
  });
  const [clinic, setClinic] = useState<any>({
    nombre: "",
    direccion_fisica: "",
    telefono_contacto: "",
    email_contacto: "",
    logo_url: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // 1. Cargar Perfil de Usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: pData } = await supabase.from('perfiles').select('*').eq('user_id', user.id).single();
      if (pData) setProfile(pData);
    }

    // 2. Cargar Clínica Principal (Primera sede)
    const { data: cData } = await supabase.from('consultorios').select('*').limit(1).single();
    if (cData) setClinic(cData);
    
    setLoading(false);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Intentar subir al bucket clinic-assets
      const { error: uploadError } = await supabase.storage
        .from('clinic-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('clinic-assets')
        .getPublicUrl(filePath);

      setClinic({ ...clinic, logo_url: publicUrl });
      alert("Logo cargado en memoria. Guarda los cambios para aplicar.");
    } catch (error: any) {
      alert("Error al subir imagen: " + error.message + ". ¿Ejecutaste el script storage_setup.sql?");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión expirada");

      // 1. Guardar Perfil
      const { error: pErr } = await supabase.from('perfiles').upsert({
        ...profile,
        user_id: user.id,
        updated_at: new Date()
      });
      if (pErr) throw pErr;

      // 2. Guardar Clínica
      const finalNombre = clinic.nombre || "Mi Consultorio";
      const finalSlug = (clinic.slug || finalNombre).toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

      // Limpiamos el objeto clinic de campos que puedan venir nulos y causar conflicto
      const { slug: _s, ...cleanClinic } = clinic;

      const { error: cErr } = await supabase.from('consultorios').upsert({
        ...cleanClinic,
        nombre: finalNombre,
        slug: finalSlug,
        owner_id: user.id,
        updated_at: new Date()
      });
      if (cErr) throw cErr;

      alert("¡Perfil y Configuración actualizados con éxito!");
      fetchData();
    } catch (err: any) {
      alert("Error al ahorrar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-40 flex flex-col items-center gap-4">
    <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
    <p className="font-black uppercase tracking-widest text-slate-400">Sincronizando identidad...</p>
  </div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 font-montserrat">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Configuración de Cuenta</h1>
          <p className="text-slate-500 font-medium tracking-wide">Gestiona tu identidad profesional y los datos maestros de tu clínica.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECCIÓN MI PERFIL */}
        <Card className="rounded-[3rem] border-slate-200 shadow-xl overflow-hidden bg-white border-2">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-10">
            <CardTitle className="flex items-center gap-4 text-3xl font-black text-slate-950 uppercase tracking-tighter">
              <User className="h-8 w-8 text-indigo-600" /> Mi Perfil de Usuario
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">Cómo te verán tus colegas y el sistema.</CardDescription>
          </CardHeader>
          <CardContent className="p-10">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.25em] text-black mb-2 block">Nombre Completo para Mostrar</label>
                <input 
                  type="text" required
                  className="w-full bg-white border-2 border-slate-300 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 transition-all font-black text-xl text-slate-950 placeholder:text-slate-300 shadow-inner"
                  value={profile?.nombre_completo || ""}
                  onChange={(e) => setProfile({...profile, nombre_completo: e.target.value})}
                  placeholder="Ej: Dr. Manuel García"
                />
              </div>
          </CardContent>
        </Card>

        {/* SECCIÓN DATOS CLÍNICA PARENT */}
        <Card className="rounded-[3rem] border-slate-200 shadow-xl overflow-hidden bg-white border-2">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-10">
            <CardTitle className="flex items-center gap-4 text-3xl font-black text-slate-950 uppercase tracking-tighter">
              <Building2 className="h-8 w-8 text-blue-600" /> Identidad Clínica Central
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">Datos principales que aparecen en tus reportes y agenda general.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            <div className="flex flex-col md:flex-row items-center gap-12">
               <div className="relative group flex-shrink-0">
                  <div className="h-44 w-44 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-600 shadow-inner">
                    {clinic?.logo_url ? (
                      <img src={clinic.logo_url} className="h-full w-full object-contain p-4" alt="Logo" />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-slate-200" />
                    )}
                    {uploading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}
                  </div>
                  <label className="absolute -bottom-3 -right-3 h-12 w-12 bg-blue-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-2xl cursor-pointer hover:scale-110 active:scale-95 transition-all border-4 border-white">
                     <Upload className="h-5 w-5" />
                     <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={uploading} />
                  </label>
               </div>
               
               <div className="flex-grow space-y-6 w-full">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-[0.25em] text-black mb-1 block">Nombre Comercial de la Clínica</label>
                    <input 
                      type="text" required
                      className="w-full bg-white border-2 border-slate-300 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 transition-all font-black text-xl text-slate-950 placeholder:text-slate-300 shadow-inner"
                      value={clinic?.nombre || ""}
                      onChange={(e) => setClinic({...clinic, nombre: e.target.value})}
                      placeholder="Ej: Clínica de Especialidades"
                    />
                  </div>
               </div>
            </div>

            <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.25em] text-black mb-1 block">Dirección Matriz</label>
                <input 
                  type="text" placeholder="Calle, Número, Colonia, C.P., Ciudad"
                  className="w-full bg-white border-2 border-slate-300 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-950 transition-all font-bold text-slate-950 placeholder:text-slate-300 shadow-inner"
                  value={clinic?.direccion_fisica || ""}
                  onChange={(e) => setClinic({...clinic, direccion_fisica: e.target.value})}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.25em] text-black mb-1 block flex items-center gap-2">
                  <Phone className="h-4 w-4" /> WhatsApp Principal
                </label>
                <input 
                  type="tel"
                  className="w-full bg-white border-2 border-slate-300 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-950 transition-all font-black text-slate-950 placeholder:text-slate-300 shadow-inner"
                  value={clinic?.telefono_contacto || ""}
                  onChange={(e) => setClinic({...clinic, telefono_contacto: e.target.value})}
                />
              </div>
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.25em] text-black mb-1 block flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email de Contacto
                </label>
                <input 
                  type="email"
                  className="w-full bg-white border-2 border-slate-300 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-950 transition-all font-black text-slate-950 placeholder:text-slate-300 shadow-inner"
                  value={clinic?.email_contacto || ""}
                  onChange={(e) => setClinic({...clinic, email_contacto: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-4 pt-10">
          <Button type="submit" className="w-full py-12 rounded-[2.5rem] font-black text-3xl flex items-center justify-center gap-4 bg-slate-950 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)]" disabled={saving}>
            {saving ? <Loader2 className="h-10 w-10 animate-spin" /> : <ShieldCheck className="h-10 w-10 text-emerald-400" />}
            {saving ? "Guardando cambios..." : "Sincronizar Perfil y Clínica"}
          </Button>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
             Seguridad de Grado Médico • Encriptado SSL activa
          </p>
        </div>
      </form>
    </div>
  );
}
