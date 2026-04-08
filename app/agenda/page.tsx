"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays, setHours, setMinutes, isSameDay, isPast, addMinutes, subHours } from "date-fns";
import { es } from "date-fns/locale";
import { 
  CheckCircle, XCircle, Clock, AlertCircle, Info, Phone, Activity, 
  MapPin, User, ChevronRight, ArrowLeft, Stethoscope, Calendar as CalendarIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

function DigitalClock() {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) return <div className="h-14 w-24 bg-slate-800 animate-pulse rounded-2xl" />;

  return (
    <div className="flex flex-col items-end gap-1 bg-slate-950/50 px-6 py-3 rounded-2xl border border-blue-500/20 shadow-inner">
       <span className="text-[9px] font-black uppercase text-blue-500 tracking-[0.3em]">Cdmx Time</span>
       <span className="text-2xl font-black text-white tabular-nums tracking-tighter">
          {time.toLocaleTimeString('es-MX', { hour12: false })}
       </span>
    </div>
  );
}

// Configuration for slots
const START_HOUR = 0;
const END_HOUR = 24;
const SLOT_DURATION = 30; // minutes

export default function PublicAgenda() {
  const [step, setStep] = useState(1); // 1: Clinic, 2: Doctor, 3: Date/Time
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  
  const [clinics, setClinics] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [broadcastChannel, setBroadcastChannel] = useState<any>(null);
  
  // Booking Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{day: Date, h: number, m: number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", telefono: "", motivo: "", especialidad_consulta: "" });

  const supabase = createSupabaseBrowser();

  // 1. Carga inicial
  useEffect(() => {
    setIsMounted(true);
    fetchClinics();
  }, []);

  // 2. Cargar doctores cuando cambia la sede
  useEffect(() => {
    if (selectedClinic) fetchDoctors(selectedClinic.id);
  }, [selectedClinic]);

  // 3. Cargar slots + REAL-TIME TOTAL
  useEffect(() => {
    if (selectedDoctor) {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const days = Array.from({ length: 5 }, (_, i) => addDays(start, i));
      setWeekDays(days);
      fetchOccupiedSlots(freshDays(selectedDate), selectedDoctor.id);

      // Suscripción Real-Time GLOBAL por tabla para máxima fiabilidad
      // Suscripción Real-Time GLOBAL por tabla + BROADCAST para máxima fiabilidad alterna
      const channel = supabase
        .channel('agenda-publica-citas-v4')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'citas' }, 
            (payload: any) => {
              console.log("⚡️ Cambio detectado en DB (Postgres):", payload.eventType, payload.new?.id || payload.old?.id);
              fetchOccupiedSlots(freshDays(selectedDate), selectedDoctor.id);
            }
        )
        .on('broadcast', { event: 'cita_actualizada' }, (payload) => {
          console.log("📢 Señal de radio recibida (Broadcast): Actualizando agenda...");
          fetchOccupiedSlots(freshDays(selectedDate), selectedDoctor.id);
        })
        .subscribe((status) => {
          console.log("📡 Estado de suscripción Realtime:", status);
        });

      // MOTOR DE HIERRO (FAIL-SAFE): Refresco cada 5 segundos si falla el Realtime
      const ironInterval = setInterval(() => {
          console.log("⚙️ Motor de Hierro: Refresco de seguridad activo...");
          fetchOccupiedSlots(freshDays(selectedDate), selectedDoctor.id);
      }, 5000);

      return () => { 
        supabase.removeChannel(channel);
        clearInterval(ironInterval);
      };
    }
  }, [selectedDoctor, selectedDate, refreshKey]);

  const freshDays = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => addDays(start, i));
  };

  const fetchClinics = async () => {
    setLoading(true);
    const { data } = await supabase.from('consultorios').select('*');
    if (data) setClinics(data);
    setLoading(false);
  };

  const fetchDoctors = async (clinicId: string) => {
    const { data } = await supabase.from('doctores').select('*').eq('consultorio_id', clinicId);
    if (data) setDoctors(data);
  };

  const fetchOccupiedSlots = async (days: Date[], doctorId: string) => {
    if (!days.length) return;
    
    const startDate = format(days[0], "yyyy-MM-dd");
    const endDate = format(days[days.length - 1], "yyyy-MM-dd");
    
    console.log("🔍 Buscando slots ocupados para:", { doctorId, startDate, endDate });
    setLoading(true);
    const { data, error } = await supabase
      .from('citas')
      .select('id, inicio, fin, retraso_min, fecha, estado')
      .eq('doctor_id', doctorId)
      .neq('estado', 'cancelada')
      .gte('fecha', startDate)
      .lte('fecha', endDate);
    
    if (error) console.error("❌ Error al traer slots:", error);
    
    if (data) {
      console.log("📅 Datos crudos de DB:", data);
      setOccupiedSlots(data);
      setLastUpdated(new Date());
    }
    setLoading(false);
  };

  const generateSlots = () => {
    const slots = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_DURATION) {
        slots.push({ h, m });
      }
    }
    return slots;
  };

  const isSlotOccupied = (day: Date, h: number, m: number) => {
    return occupiedSlots.some(apt => {
        const aptTime = new Date(apt.inicio);
        const slotTime = setMinutes(setHours(day, h), m);
        
        // COMPARACIÓN ROBUSTA: Usamos getTime() para evitar problemas de objetos fecha
        // Normalizamos a minutos (quitamos segundos y ms)
        const aptMs = Math.floor(aptTime.getTime() / 60000);
        const slotMs = Math.floor(slotTime.getTime() / 60000);

        return aptMs === slotMs;
    });
  };

  const isSlotPast = (day: Date, h: number, m: number) => {
    const slotTime = setMinutes(setHours(day, h), m);
    return isPast(slotTime);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedClinic || !selectedDoctor) return;
    setIsSubmitting(true);
    
    try {
      // 1. BUSCAR O CREAR PACIENTE (PRE-CAPTURA)
      let patientId;
      const { data: existingP } = await supabase.from('pacientes').select('id').eq('telefono', formData.telefono).maybeSingle();
      
      if (existingP) {
        patientId = existingP.id;
      } else {
        const { data: newP, error: pE } = await supabase.from('pacientes').insert({ 
            nombre: formData.nombre, 
            telefono: formData.telefono,
            consultorio_id: selectedClinic.id,
            notas_generales: `[PRE-CAPTURA PACIENTE] Motivo: ${formData.motivo}`
        }).select().single();
        if (pE) throw pE;
        patientId = newP.id;
      }

      // 2. VERIFICAR SI EL HORARIO SIGUE DISPONIBLE (PREVENCIÓN DE EMPALMES)
      const inicio = setMinutes(setHours(selectedSlot.day, selectedSlot.h), selectedSlot.m);
      const fin = addMinutes(inicio, SLOT_DURATION);

      const { data: existingAppt } = await supabase
        .from('citas')
        .select('id')
        .eq('doctor_id', selectedDoctor.id)
        .lt('inicio', fin.toISOString())
        .gt('fin', inicio.toISOString())
        .maybeSingle();

      if (existingAppt) {
        alert("Lo sentimos, este horario acaba de ser reservado por alguien más. Por favor, selecciona otro horario disponible.");
        // Refrescamos los slots para que el usuario vea la actualización
        fetchOccupiedSlots(weekDays, selectedDoctor.id);
        setIsModalOpen(false);
        setIsSubmitting(false);
        return;
      }

      // 3. CREAR CITA

      const { error: bE } = await supabase.from('citas').insert({
        paciente_id: patientId,
        consultorio_id: selectedClinic.id,
        doctor_id: selectedDoctor.id,
        fecha: format(selectedSlot.day, "yyyy-MM-dd"),
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        motivo: formData.motivo,
        estado: 'pendiente'
      });

      if (bE) throw bE;

      alert("¡Cita solicitada con éxito! Te contactaremos por WhatsApp.");
      setIsModalOpen(false);
      setFormData({ nombre: "", telefono: "", motivo: "", especialidad_consulta: "" });
      fetchOccupiedSlots(weekDays, selectedDoctor.id);
    } catch (error: any) {
      alert("Error al agendar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const restart = () => {
    setStep(1);
    setSelectedClinic(null);
    setSelectedDoctor(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-12 font-montserrat flex flex-col items-center">
      <div className="max-w-6xl w-full space-y-12">
        {/* Futuristic Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-8 bg-slate-900/40 p-8 rounded-[3rem] border border-slate-800 backdrop-blur-md shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32" />
           <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                 <Activity className="h-8 w-8 text-white" />
              </div>
               <div className="space-y-1">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Consola de Agendamiento</h1>
                  <p className="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-2">
                     <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> 
                     {lastUpdated ? `Actualizado ${format(lastUpdated, 'HH:mm:ss')}` : 'Sincronizando...'}
                  </p>
               </div>
           </div>
           <div className="flex items-center gap-4">
              {selectedDoctor && (
                <button
                  onClick={() => setRefreshKey(k => k + 1)}
                  className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-2xl transition-all active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Actualizar
                </button>
              )}
              <DigitalClock />
              <div className="hidden md:flex gap-2">
                 {[1, 2, 3].map(i => (
                     <div key={i} className={cn(
                         "h-1.5 w-12 rounded-full transition-all duration-500",
                         step >= i ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : "bg-slate-800"
                     )} />
                 ))}
              </div>
           </div>
        </header>

        <AnimatePresence mode="wait">
          {/* STEP 1: CLINIC SELECTION */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {clinics.map(clinic => (
                  <Card key={clinic.id} onClick={() => { setSelectedClinic(clinic); setStep(2); }} className="bg-slate-900/40 backdrop-blur-xl border-slate-800 rounded-[2.5rem] overflow-hidden hover:border-blue-500/50 hover:translate-y-[-5px] transition-all cursor-pointer group">
                      <CardContent className="p-8 space-y-6">
                         <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">
                            <MapPin className="h-8 w-8 text-blue-400 group-hover:text-white" />
                         </div>
                         <div className="space-y-2">
                            <h3 className="text-xl font-black text-white">{clinic.nombre}</h3>
                            <p className="text-sm text-slate-400 font-medium">{clinic.direccion_fisica || "Dirección no especificada"}</p>
                         </div>
                         <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-blue-400 gap-2">
                            Seleccionar Sede <ChevronRight className="h-3 w-3" />
                         </div>
                      </CardContent>
                   </Card>
                ))}
               {loading && [1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-900/40 rounded-[2.5rem] animate-pulse border border-slate-800" />)}
            </motion.div>
          )}

          {/* STEP 2: DOCTOR SELECTION */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
               <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-300 flex items-center gap-2 uppercase tracking-widest">
                     <User className="h-5 w-5 text-indigo-400" /> Elige tu Especialista
                  </h2>
                  <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-500 hover:text-white flex items-center gap-2 font-black text-[10px] tracking-widest uppercase">
                     <ArrowLeft className="h-4 w-4" /> Cambiar Sede
                  </Button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {doctors.map(doc => (
                  <Card key={doc.id} onClick={() => { setSelectedDoctor(doc); setStep(3); }} className="bg-slate-950/40 backdrop-blur-2xl border-slate-800 rounded-[3rem] overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer group p-8">
                      <div className="flex items-center gap-8">
                         <div className="relative">
                            <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-indigo-500/20 group-hover:border-indigo-500 transition-all">
                               <img src={doc.foto_url} alt={doc.nombre} className="h-full w-full object-cover" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-[#020617]">
                               <Stethoscope className="h-4 w-4 text-white" />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white">{doc.nombre}</h3>
                            <p className="text-sm bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 inline-block">
                               {doc.especialidad || "Especialista"}
                            </p>
                         </div>
                      </div>
                  </Card>
                ))}
               {doctors.length === 0 && !loading && (
                   <div className="col-span-full py-20 text-center space-y-4">
                      <User className="h-16 w-16 text-slate-700 mx-auto" />
                      <p className="text-slate-400">No hay doctores registrados en esta sede aún.</p>
                      <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl border-slate-800">Cambiar de Sede</Button>
                   </div>
               )}
               </div>
            </motion.div>
          )}

          {/* STEP 3: DATE & TIME SELECTION */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
               <div className="flex justify-start">
                  <Button variant="ghost" onClick={() => setStep(2)} className="text-slate-500 hover:text-white flex items-center gap-2 font-black text-[10px] tracking-widest uppercase mb-4">
                     <ArrowLeft className="h-4 w-4" /> Cambiar Especialista
                  </Button>
               </div>
               
               <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 shadow-xl">
                  <div className="flex items-center gap-4">
                     <img src={selectedDoctor?.foto_url} className="h-12 w-12 rounded-full border border-indigo-500/30" alt="" />
                     <div>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Atención con</p>
                        <h4 className="font-black text-white">{selectedDoctor?.nombre}</h4>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-950/50 p-2 rounded-2xl border border-slate-800 shadow-inner">
                     <Button variant="ghost" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="rounded-xl h-10 w-10 p-0 hover:bg-white/10 transition-all shadow-none">←</Button>
                     <div className="px-6 text-sm font-black text-slate-200 uppercase tracking-tighter">
                        {format(weekDays[0] || new Date(), "d MMM")} - {format(weekDays[4] || new Date(), "d MMM, yyyy")}
                     </div>
                     <Button variant="ghost" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="rounded-xl h-10 w-10 p-0 hover:bg-white/10 transition-all shadow-none">→</Button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {weekDays.map((day, idx) => (
                  <motion.div key={day.toISOString()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} className="bg-slate-950/30 rounded-[2.5rem] border border-slate-800/50 flex flex-col overflow-hidden backdrop-blur-sm">
                    <div className="p-6 border-b border-white/5 flex flex-col items-center gap-1 bg-slate-900/20">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{format(day, "eee", { locale: es })}</span>
                      <span className="text-2xl font-black text-white">{format(day, "d")}</span>
                    </div>
                    <div className="p-4 space-y-3 custom-scrollbar overflow-y-auto max-h-[400px]">
                      {generateSlots().map((slot) => {
                        const occupied = isSlotOccupied(day, slot.h, slot.m);
                        const past = isSlotPast(day, slot.h, slot.m);
                        const now = new Date();
                        const slotTime = setMinutes(setHours(day, slot.h), slot.m);
                        const isRecent = isSameDay(day, now) && slotTime > subHours(now, 2);
                        
                        if (past && !occupied && !isRecent) return null;

                        return (
                          <button key={`${slot.h}-${slot.m}`} disabled={occupied || (past && !occupied)} onClick={() => {
                            if (past && !occupied) return;
                            setSelectedSlot({ day, h: slot.h, m: slot.m });
                            setIsModalOpen(true);
                          }} className={cn(
                            "w-full py-3 px-3 rounded-2xl border-2 transition-all flex items-center justify-between group",
                            occupied ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : 
                            (past ? "bg-slate-950/20 border-slate-900 text-slate-700 opacity-40" : "bg-emerald-500/5 border-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-600")
                          )}>
                            <div className="flex flex-col items-start translate-y-[-2px]">
                                <span className="text-[11px] font-black">{slot.h}:{slot.m === 0 ? "00" : slot.m}</span>
                                {occupied && <span className="text-[7px] font-black uppercase text-rose-500 tracking-widest mt-[-2px]">OCUPADO</span>}
                            </div>
                            {occupied ? <XCircle className="h-3 w-3" /> : (past ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3 opacity-50" />)}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info / Badge */}
        <footer className="text-center opacity-40 hover:opacity-100 transition-opacity">
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">NeoMed Pro Digital Console v3.2</p>
        </footer>
      </div>

      {/* Booking Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[3rem] bg-[#020617] border border-slate-800 p-10 text-slate-200">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
          
          <DialogHeader className="pt-2">
            <DialogTitle className="text-3xl font-black text-white tracking-tight">Cerrar Reserva</DialogTitle>
            <DialogDescription className="text-slate-500">Revisa tu información y completa el motivo.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBooking} className="space-y-6 py-6 overflow-hidden">
            <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-800 space-y-4">
               <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                     <MapPin className="h-4 w-4 text-blue-400" />
                     <span className="text-xs font-black uppercase text-slate-100">{selectedClinic?.nombre}</span>
                  </div>
                  <Button variant="ghost" onClick={restart} className="h-6 text-[8px] font-black text-slate-500">CAMBIAR</Button>
               </div>
               <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                     <User className="h-4 w-4 text-indigo-400" />
                     <span className="text-xs font-black uppercase text-slate-100">{selectedDoctor?.nombre}</span>
                  </div>
                  <Button variant="ghost" onClick={() => setStep(2)} className="h-6 text-[8px] font-black text-slate-500">CAMBIAR</Button>
               </div>
               <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-3">
                  <CalendarIcon className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-black text-emerald-100">
                     {selectedSlot && format(selectedSlot.day, "EEEE d 'de' MMMM", { locale: es })} • {selectedSlot?.h}:{selectedSlot?.m === 0 ? "00" : selectedSlot?.m}
                  </span>
               </div>
            </div>

            <div className="space-y-6 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80 mb-2 block">Nombre del Paciente</label>
                <input required className="w-full p-5 rounded-3xl bg-slate-800 border-2 border-slate-700 text-white placeholder:text-slate-500 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-bold transition-all text-lg shadow-inner"
                  placeholder="Ej: Juan Pérez" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80 mb-2 block">WhatsApp de Contacto</label>
                <input required type="tel" className="w-full p-5 rounded-3xl bg-slate-800 border-2 border-slate-700 text-white placeholder:text-slate-500 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-bold transition-all text-lg shadow-inner"
                  placeholder="10 dígitos" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80 mb-2 block">Resumen de Síntomas / Consulta</label>
                <textarea required className="w-full p-5 rounded-3xl bg-slate-800 border-2 border-slate-700 text-white placeholder:text-slate-500 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 h-32 font-bold transition-all text-lg shadow-inner resize-none"
                  placeholder="Describe brevemente el motivo..." value={formData.motivo} onChange={(e) => setFormData({...formData, motivo: e.target.value})} />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full rounded-[1.5rem] py-8 font-black text-xl bg-gradient-to-r from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                {isSubmitting ? "Sincronizando..." : "Solicitar Cita"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
}
