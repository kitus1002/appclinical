"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  UserPlus, 
  Stethoscope, 
  Upload, 
  Trash2, 
  Edit3, 
  Loader2,
  Image as ImageIcon,
  Building2,
  BookOpen,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    email_login: "",
    especialidades: [] as string[],
    biografia: "",
    foto_url: "",
    consultorio_id: ""
  });
  const [specInput, setSpecInput] = useState("");

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: dData } = await supabase.from('doctores').select('*, consultorios(nombre)');
    const { data: cData } = await supabase.from('consultorios').select('id, nombre');
    if (dData) setDoctors(dData);
    if (cData) {
        setClinics(cData);
        if (cData.length > 0 && !formData.consultorio_id) {
            setFormData(prev => ({ ...prev, consultorio_id: cData[0].id }));
        }
    }
    setLoading(false);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `doctors/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('clinic-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('clinic-assets')
        .getPublicUrl(filePath);

      setFormData({ ...formData, foto_url: publicUrl });
    } catch (error: any) {
      alert("Error al subir foto: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Convertir input de especialidades a array
    const espArray = specInput.split(',').map(s => s.trim()).filter(s => s !== "");

    const { error } = await supabase
      .from('doctores')
      .upsert({
        ...formData,
        especialidades: espArray,
        id: formData.id || undefined
      });

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ id: null, nombre: "", email_login: "", especialidades: [], biografia: "", foto_url: "", consultorio_id: clinics[0]?.id });
      setSpecInput("");
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleEdit = (doc: any) => {
    setFormData({
        id: doc.id,
        nombre: doc.nombre,
        email_login: doc.email_login || "",
        especialidades: doc.especialidades || [],
        biografia: doc.biografia,
        foto_url: doc.foto_url,
        consultorio_id: doc.consultorio_id
    });
    setSpecInput((doc.especialidades || []).join(", "));
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar a este especialista?")) return;
    const { error } = await supabase.from('doctores').delete().eq('id', id);
    if (error) alert(error.message); else fetchData();
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-40 gap-4">
    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
    <p className="font-bold text-slate-400">Cargando Staff Médico...</p>
  </div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black font-montserrat tracking-tight bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">Gestión de Especialistas</h1>
          <p className="text-slate-500 font-medium tracking-wide">Administra el talento médico y sus diversas especialidades.</p>
        </div>
        <Button onClick={() => { 
            setFormData({ id: null, nombre: "", email_login: "", especialidades: [], biografia: "", foto_url: "", consultorio_id: clinics[0]?.id }); 
            setSpecInput("");
            setIsModalOpen(true); 
        }} className="bg-slate-900 px-8 py-7 rounded-[1.5rem] font-black text-lg hover:scale-105 transition-all shadow-xl active:scale-95 border border-white/5">
          <UserPlus className="h-5 w-5 mr-3" /> Añadir Doctor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {doctors.map(doc => (
          <Card key={doc.id} className="rounded-[3rem] border-slate-200 shadow-xl overflow-hidden bg-white/80 backdrop-blur-md group hover:border-indigo-500/50 transition-all border-2">
            <CardContent className="p-0">
               <div className="relative h-56 bg-slate-100">
                  {doc.foto_url ? (
                    <img src={doc.foto_url} className="h-full w-full object-cover" alt={doc.nombre} />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                       <ImageIcon className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-4 right-4 flex gap-2">
                     <Button size="icon" variant="secondary" onClick={() => handleEdit(doc)} className="rounded-xl h-10 w-10 shadow-lg hover:bg-slate-900 group/btn hover:border-transparent">
                        <Edit3 className="h-4 w-4 group-hover/btn:text-white" />
                     </Button>
                     <Button size="icon" variant="destructive" onClick={() => handleDelete(doc.id)} className="rounded-xl h-10 w-10 shadow-lg">
                        <Trash2 className="h-4 w-4 text-white" />
                     </Button>
                  </div>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="space-y-3">
                     <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{doc.nombre}</h3>
                     <div className="flex flex-wrap gap-2">
                        {(doc.especialidades || []).map((esp: string) => (
                           <span key={esp} className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1">
                              <Tag className="h-2 w-2" /> {esp}
                           </span>
                        ))}
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-bold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                     <Building2 className="h-4 w-4 text-slate-400" /> {doc.consultorios?.nombre || "Sede Desconocida"}
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                     <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-300">{i}</div>)}
                     </div>
                     <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full animate-pulse">ACTIVO</span>
                  </div>
               </div>
            </CardContent>
          </Card>
        ))}
        {doctors.length === 0 && (
            <div className="col-span-full py-24 text-center border-4 border-dashed border-slate-200 rounded-[3.5rem] space-y-4 bg-slate-50/50">
                <div className="h-20 w-20 bg-white rounded-3xl shadow-sm mx-auto flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-slate-200" />
                </div>
                <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Aún no hay especialistas registrados</p>
                <Button variant="outline" onClick={() => setIsModalOpen(true)} className="rounded-2xl border-slate-300 font-bold">Comenzar Registro</Button>
            </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-[3.5rem] bg-white border-none p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]">
           <DialogHeader className="space-y-4">
              <DialogTitle className="text-4xl font-black font-montserrat tracking-tighter flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Stethoscope className="h-6 w-6 text-white" />
                 </div>
                 {formData.id ? "Editar Perfil" : "Nuevo Especialista"}
              </DialogTitle>
              <DialogDescription className="text-lg font-medium text-slate-500">Configura las especialidades y trayectoria del doctor.</DialogDescription>
           </DialogHeader>

           <form onSubmit={handleSave} className="space-y-8 py-8">
              <div className="flex flex-col md:flex-row gap-10 items-start">
                  <div className="relative group flex-shrink-0">
                     <div className="h-40 w-40 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-600 shadow-inner">
                        {formData.foto_url ? (
                          <img src={formData.foto_url} className="h-full w-full object-cover" alt="Preview" />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-slate-200" />
                        )}
                        {uploading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}
                     </div>
                     <label className="absolute -bottom-3 -right-3 h-12 w-12 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-2xl cursor-pointer hover:scale-110 active:scale-95 transition-all border-4 border-white">
                        <Upload className="h-5 w-5" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadPhoto} />
                     </label>
                  </div>

                  <div className="flex-grow space-y-8 w-full">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Nombre Completo Profesional</label>
                        <input required className="w-full bg-white border-2 border-slate-300 rounded-3xl px-7 py-5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-black text-xl text-slate-900 placeholder:text-slate-400 shadow-sm"
                          placeholder="Ej: Dr. Alejandro Martínez" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
                     </div>
                     
                     <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Correo de Acceso (Login)</label>
                        <input required type="email" className="w-full bg-white border-2 border-slate-300 rounded-3xl px-7 py-5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-900 placeholder:text-slate-400 shadow-inner"
                          placeholder="doctor@clinica.com" value={formData.email_login} onChange={(e) => setFormData({...formData, email_login: e.target.value})} />
                         <p className="text-[10px] text-slate-400 italic ml-2">Este correo se usará para que el doctor inicie sesión.</p>
                      </div>

                      <div className="space-y-2 text-left">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Especialidades (Separadas por COMA)</label>
                         <input required className="w-full bg-white border-2 border-slate-300 rounded-3xl px-7 py-5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-900 placeholder:text-slate-400 shadow-inner"
                           placeholder="Ej: Pediatría, Neonatología, Cirugía" value={specInput} onChange={(e) => setSpecInput(e.target.value)} />
                         <p className="text-[10px] text-slate-400 italic ml-2">El paciente podrá elegir entre estas opciones al agendar.</p>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Asignar Sede / Sucursal</label>
                     <div className="relative">
                        <select required className="w-full bg-white border-2 border-slate-300 rounded-3xl px-7 py-5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-black text-slate-900 appearance-none shadow-sm"
                          value={formData.consultorio_id} onChange={(e) => setFormData({...formData, consultorio_id: e.target.value})}>
                           {clinics.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                     </div>
                  </div>
              </div>

              <div className="space-y-2 text-left">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 ml-2">
                  <BookOpen className="h-4 w-4 text-slate-600" /> Biografía y Experiencia
                </label>
                <textarea className="w-full bg-white border-2 border-slate-300 rounded-[2.5rem] px-7 py-6 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-medium text-slate-900 h-40 shadow-inner resize-none appearance-none placeholder:text-slate-400"
                  placeholder="Detalla los estudios y logros del especialista..." value={formData.biografia} onChange={(e) => setFormData({...formData, biografia: e.target.value})} />
              </div>

              <DialogFooter className="pt-8">
                <Button type="submit" className="w-full rounded-[2.5rem] py-10 font-black text-2xl bg-indigo-700 text-white shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all border-none" disabled={isSubmitting}>
                   {isSubmitting ? "Sincronizando Sistemas..." : (formData.id ? "Actualizar Especialista" : "Registrar Especialista")}
                </Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChevronDown(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
