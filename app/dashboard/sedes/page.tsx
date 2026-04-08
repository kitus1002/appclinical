"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Building2, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  Trash2, 
  Edit3, 
  Loader2,
  Image as ImageIcon,
  Upload,
  ExternalLink
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export default function SedesPage() {
  const [sedes, setSedes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    slug: "",
    direccion_fisica: "",
    telefono_contacto: "",
    email_contacto: "",
    logo_url: ""
  });

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    fetchSedes();
  }, []);

  const fetchSedes = async () => {
    setLoading(true);
    const { data } = await supabase.from('consultorios').select('*').order('created_at', { ascending: false });
    if (data) setSedes(data);
    setLoading(false);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `sedes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('clinic-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('clinic-assets')
        .getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: publicUrl });
    } catch (error: any) {
      alert("Error al subir logo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const slug = formData.nombre.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Sesión expirada.");

    const { error } = await supabase
      .from('consultorios')
      .upsert({
        ...formData,
        slug: formData.slug || slug,
        owner_id: user.id,
        id: formData.id || undefined
      });

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ id: null, nombre: "", slug: "", direccion_fisica: "", telefono_contacto: "", email_contacto: "", logo_url: "" });
      fetchSedes();
    }
    setIsSubmitting(false);
  };

  const handleEdit = (sede: any) => {
    setFormData({
        id: sede.id,
        nombre: sede.nombre,
        slug: sede.slug,
        direccion_fisica: sede.direccion_fisica,
        telefono_contacto: sede.telefono_contacto,
        email_contacto: sede.email_contacto,
        logo_url: sede.logo_url
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta sede? Perderás el acceso a las agendas vinculadas.")) return;
    const { error } = await supabase.from('consultorios').delete().eq('id', id);
    if (error) alert(error.message); else fetchSedes();
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-40 gap-4">
    <Loader2 className="h-10 w-10 animate-spin text-slate-600" />
    <p className="font-bold text-slate-400">Cargando Ubicaciones Clínica...</p>
  </div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0 font-montserrat">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Gestión de Sedes</h1>
          <p className="text-slate-500 font-medium tracking-wide">Administra las sucursales y ubicaciones físicas de tu clínica.</p>
        </div>
        <Button onClick={() => { 
            setFormData({ id: null, nombre: "", slug: "", direccion_fisica: "", telefono_contacto: "", email_contacto: "", logo_url: "" }); 
            setIsModalOpen(true); 
        }} className="bg-slate-950 px-8 py-7 rounded-[1.5rem] font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl">
          <Plus className="h-5 w-5 mr-3" /> Añadir Sede
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sedes.map(sede => (
          <Card key={sede.id} className="rounded-[3rem] border-slate-200 shadow-xl overflow-hidden bg-white group hover:border-slate-950 transition-all border-2">
            <CardContent className="p-0">
               <div className="relative h-40 bg-slate-50 flex items-center justify-center border-b border-slate-100">
                  {sede.logo_url ? (
                    <img src={sede.logo_url} className="h-24 w-auto object-contain" alt={sede.nombre} />
                  ) : (
                    <Building2 className="h-16 w-16 text-slate-200" />
                  )}
                  <div className="absolute top-6 right-6 flex gap-2">
                     <Button size="icon" variant="ghost" onClick={() => handleEdit(sede)} className="rounded-xl h-10 w-10 bg-white shadow-md hover:bg-slate-900 group/btn">
                        <Edit3 className="h-4 w-4 group-hover/btn:text-white" />
                     </Button>
                     <Button size="icon" variant="ghost" onClick={() => handleDelete(sede.id)} className="rounded-xl h-10 w-10 bg-white shadow-md hover:text-rose-600">
                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-rose-600" />
                     </Button>
                  </div>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="space-y-1">
                     <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">{sede.nombre}</h3>
                     <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 tracking-widest bg-slate-50 px-3 py-1 rounded-full w-fit">
                        ID: {sede.slug}
                     </div>
                  </div>
                  
                  <div className="space-y-3">
                     <div className="flex items-start gap-3 text-slate-700 text-sm font-bold">
                        <MapPin className="h-5 w-5 text-slate-400 mt-1" /> {sede.direccion_fisica || "Dirección no registrada"}
                     </div>
                     <div className="flex items-center gap-3 text-slate-700 text-sm font-bold">
                        <Phone className="h-5 w-5 text-slate-400" /> {sede.telefono_contacto || "Sin teléfono"}
                     </div>
                  </div>

                  <div className="pt-6 flex items-center justify-between border-t border-slate-100">
                     <Link href={`/agenda?sede=${sede.slug}`} target="_blank" className="text-[10px] font-black text-slate-400 hover:text-slate-950 flex items-center gap-1 transition-all uppercase tracking-widest">
                        Ver Agenda <ExternalLink className="h-3 w-3" />
                     </Link>
                     <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">Sede Activa</span>
                  </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-[3.5rem] bg-white border-none p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]">
           <DialogHeader className="space-y-4">
              <DialogTitle className="text-4xl font-black text-slate-950 uppercase tracking-tighter flex items-center gap-4">
                 <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                    <Building2 className="h-7 w-7 text-slate-900" />
                 </div>
                 {formData.id ? "Editar Sede" : "Nueva Sede"}
              </DialogTitle>
              <DialogDescription className="text-lg font-medium text-slate-500">Configura la ubicación física de tu sucursal clínica.</DialogDescription>
           </DialogHeader>

           <form onSubmit={handleSave} className="space-y-8 py-8">
              <div className="flex flex-col md:flex-row gap-10 items-center justify-center">
                  <div className="relative group flex-shrink-0">
                     <div className="h-40 w-40 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-slate-950 shadow-inner">
                        {formData.logo_url ? (
                          <img src={formData.logo_url} className="h-full w-full object-contain p-4" alt="Preview" />
                        ) : (
                          <ImageIcon className="h-10 w-10 text-slate-200" />
                        )}
                        {uploading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-900" /></div>}
                     </div>
                     <label className="absolute -bottom-3 -right-3 h-12 w-12 bg-slate-900 rounded-[1.2rem] flex items-center justify-center text-white shadow-2xl cursor-pointer hover:scale-110 active:scale-95 transition-all border-4 border-white">
                        <Upload className="h-5 w-5" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} />
                     </label>
                  </div>
              </div>

              <div className="space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black ml-2 mb-1 block">Nombre de la Sede / Sucursal</label>
                    <input required className="w-full bg-white border-2 border-slate-300 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-950 transition-all font-black text-xl placeholder:text-slate-300 text-slate-950"
                      placeholder="Ej: Sucursal Centro" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black ml-2 mb-1 block">Dirección Física Completa</label>
                    <input required className="w-full bg-white border-2 border-slate-300 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-950 transition-all font-bold text-slate-950 placeholder:text-slate-300"
                      placeholder="Calle, Número, Colonia, C.P., Ciudad" value={formData.direccion_fisica} onChange={(e) => setFormData({...formData, direccion_fisica: e.target.value})} />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black ml-2 mb-1 block">WhatsApp Contacto</label>
                        <input required className="w-full bg-white border-2 border-slate-300 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-950 transition-all font-black text-slate-950 placeholder:text-slate-300"
                          placeholder="55-1234-5678" value={formData.telefono_contacto} onChange={(e) => setFormData({...formData, telefono_contacto: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black ml-2 mb-1 block">Email de la Sucursal</label>
                        <input required type="email" className="w-full bg-white border-2 border-slate-300 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-950 transition-all font-black text-slate-950 placeholder:text-slate-300"
                          placeholder="sucursal@clinica.com" value={formData.email_contacto} onChange={(e) => setFormData({...formData, email_contacto: e.target.value})} />
                    </div>
                 </div>
              </div>

              <DialogFooter className="pt-8">
                <Button type="submit" className="w-full rounded-[2.5rem] py-10 font-black text-2xl bg-slate-950 text-white shadow-2xl hover:scale-[1.02] active:scale-95 transition-all border-none" disabled={isSubmitting}>
                   {isSubmitting ? "Sincronizando Sistemas..." : (formData.id ? "Actualizar Sede" : "Registrar Sede")}
                </Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import Link from "next/link";
