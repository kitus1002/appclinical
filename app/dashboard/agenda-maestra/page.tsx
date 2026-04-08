"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, Plus, Info, Search, UserPlus, CheckCircle2, ChevronDown, Stethoscope, Phone, MessageSquare, Building2, X, Trash2 } from "lucide-react";
import { format, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

// Dynamic import with SSR disabled
const CalendarComponent = dynamic(() => import('@/components/dashboard/CalendarComponent'), {
  ssr: false,
  loading: () => <div className="h-[700px] flex items-center justify-center bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/5 text-slate-400 font-black uppercase tracking-widest animate-pulse">Iniciando sistemas de agenda...</div>
});

export default function MasterAgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [broadcastChannel, setBroadcastChannel] = useState<any>(null);
  
  // Booking Form State
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [clinicId, setClinicId] = useState<string>("");

  // Sedes
  const [sedes, setSedes] = useState<any[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<string>("");

  const [newApt, setNewApt] = useState({
      fecha: format(new Date(), 'yyyy-MM-dd'),
      inicio: "09:00",
      duracion: 30,
      motivo: "",
      telefono_nuevo: ""
  });

  // Event Detail State
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    fetchInitialData();
    
    // Inicializar canal de broadcast
    const ch = supabase.channel('agenda-publica-citas-v4');
    ch.subscribe();
    setBroadcastChannel(ch);

    const channel = supabase
      .channel('master-agenda-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => fetchAppointments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    // 1. Obtener Sedes
    const { data: clinics } = await supabase.from('consultorios').select('id, nombre');
    if (clinics && clinics.length > 0) {
        setSedes(clinics);
        setSelectedSedeId(clinics[0].id);
        setClinicId(clinics[0].id);
        // 2. Obtener Doctores de la primer sede
        const { data: docs } = await supabase.from('doctores').select('id, nombre, consultorio_id').eq('consultorio_id', clinics[0].id);
        if (docs) {
            setDoctors(docs);
            if (docs.length > 0) setSelectedDoctorId(docs[0].id);
        }
    }
    await fetchAppointments();
    setLoading(false);
  };

  const handleSedeChange = async (sedeId: string) => {
    setSelectedSedeId(sedeId);
    setClinicId(sedeId);
    // Cargar doctores de la nueva sede automáticamente
    const { data: docs } = await supabase.from('doctores').select('id, nombre, consultorio_id').eq('consultorio_id', sedeId);
    if (docs) {
        setDoctors(docs);
        if (docs.length > 0) {
            setSelectedDoctorId(docs[0].id);
        } else {
            setSelectedDoctorId("");
        }
    }
  };

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from('citas')
      .select(`id, inicio, fin, fecha, motivo, estado, retraso_min, doctor_id, pacientes ( id, nombre, telefono )`);
    
    if (data) {
      const formattedEvents = data.map((apt: any) => ({
        id: apt.id,
        title: `${apt.pacientes?.nombre || 'Paciente'} - ${apt.motivo || 'Consulta'}`,
        start: apt.inicio,
        end: apt.fin,
        backgroundColor: apt.estado === 'pendiente' ? '#3b82f6' : apt.estado === 'confirmada' ? '#10b981' : '#64748b',
        borderColor: 'rgba(255,255,255,0.1)',
        textColor: '#fff',
        extendedProps: { 
            estado: apt.estado,
            motivo: apt.motivo,
            pacienteNom: apt.pacientes?.nombre,
            pacienteTel: apt.pacientes?.telefono,
            pacienteId: apt.pacientes?.id,
            doctorId: apt.doctor_id
        }
      }));
      setEvents(formattedEvents);
    }
  };

  const searchPatients = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
        setPatients([]);
        return;
    }
    const { data } = await supabase.from('pacientes').select('*').ilike('nombre', `%${query}%`).limit(5);
    if (data) setPatients(data);
  };

  const checkOverlap = async (doctorId: string, start: string, end: string, excludeId?: string) => {
    let query = supabase
      .from('citas')
      .select('id')
      .eq('doctor_id', doctorId)
      .neq('estado', 'cancelada')
      .lt('inicio', end)
      .gt('fin', start);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data } = await query.maybeSingle();
    return !!data;
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        let patientId = selectedPatient?.id;

        // Lógica de Pre-captura: Si no hay paciente seleccionado, crearlo
        if (!patientId) {
            if (!searchQuery || !newApt.telefono_nuevo) {
                throw new Error("Para un paciente nuevo, ingresa nombre y teléfono.");
            }
            const { data: newP, error: pErr } = await supabase.from('pacientes').insert({
                nombre: searchQuery,
                telefono: newApt.telefono_nuevo,
                consultorio_id: clinicId
            }).select().single();
            
            if (pErr) throw pErr;
            patientId = newP.id;
        }

        const startDateTime = new Date(`${newApt.fecha}T${newApt.inicio}`);
        const endDateTime = new Date(startDateTime.getTime() + newApt.duracion * 60000);

        // VERIFICAR EMPALME
        const hasOverlap = await checkOverlap(selectedDoctorId, startDateTime.toISOString(), endDateTime.toISOString());
        if (hasOverlap) {
            alert("Error: Ya existe una cita para este especialista en el horario seleccionado.");
            setIsSubmitting(false);
            return;
        }

        const { error } = await supabase.from('citas').insert({
            paciente_id: patientId,
            consultorio_id: clinicId,
            doctor_id: selectedDoctorId,
            fecha: newApt.fecha,
            inicio: startDateTime.toISOString(),
            fin: endDateTime.toISOString(),
            motivo: newApt.motivo,
            estado: 'confirmada'
        });

        if (error) throw error;

        // EMITIR SEÑAL DE RADIO PARA EL PACIENTE
        if (broadcastChannel) {
            broadcastChannel.send({ type: 'broadcast', event: 'cita_actualizada', payload: { patientId } });
        }

        setIsBookingOpen(false);
        setSelectedPatient(null);
        setSearchQuery("");
        setNewApt({ ...newApt, telefono_nuevo: "", motivo: "" });
        fetchAppointments();
        alert("¡Cita agendada con éxito!");

    } catch (err: any) {
        alert("Error: " + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEventUpdate = async (info: any) => {
    const { id, start, end } = info.event;
    
    // PODER ADMIN: Eliminamos el bloqueo de empalme al mover (el admin decide)
    console.log("💾 Moviendo cita (Poder Admin)...", { id, start: start.toISOString() });

    const { error } = await supabase.from('citas').update({
        inicio: start.toISOString(),
        fin: end?.toISOString() || addMinutes(start, 30).toISOString(),
        fecha: format(start, 'yyyy-MM-dd')
    }).eq('id', id);

    if (error) { 
        console.error("❌ Error en update:", error);
        info.revert(); 
        alert("Error al sincronizar movimiento: " + error.message); 
    } else {
        console.log("✅ Movimiento guardado en DB");
        // EMITIR SEÑAL DE RADIO PARA EL PACIENTE
        if (broadcastChannel) {
            broadcastChannel.send({ type: 'broadcast', event: 'cita_actualizada', payload: { id } });
        }
        setEvents(prev => prev.map(ev => 
            ev.id === id ? { ...ev, start: start.toISOString(), end: end?.toISOString() || addMinutes(start, 30).toISOString() } : ev
        ));
    }
  };

  const handleEventClick = (info: any) => {
    const { extendedProps } = info.event;
    const doctor = doctors.find(d => d.id === extendedProps.doctorId);
    setSelectedEvent({
        id: info.event.id,
        nombre: extendedProps.pacienteNom,
        telefono: extendedProps.pacienteTel,
        motivo: extendedProps.motivo,
        estado: extendedProps.estado,
        doctorNom: doctor?.nombre || "No asignado",
        start: info.event.start,
        end: info.event.end || addMinutes(info.event.start, 30)
    });
    setIsDetailOpen(true);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    // CAPTURA DE TIEMPO REAL: Usamos el estado del objeto seleccionado que se cargó al hacer clic
    const timeStart = selectedEvent?.start;
    const timeEnd = selectedEvent?.end;
    
    console.log("🔄 Confirmando estado y posición...", { id, newStatus, start: timeStart });

    const { error } = await supabase
      .from('citas')
      .update({ 
          estado: newStatus,
          inicio: timeStart instanceof Date ? timeStart.toISOString() : timeStart,
          fin: timeEnd instanceof Date ? timeEnd.toISOString() : timeEnd,
          fecha: format(new Date(timeStart), 'yyyy-MM-dd')
      })
      .eq('id', id);
    
    if (error) {
        alert("Fallo crítico al confirmar: " + error.message);
    } else {
        // EMITIR SEÑAL DE RADIO PARA EL PACIENTE (Solo en éxito)
        if (broadcastChannel) {
            broadcastChannel.send({ type: 'broadcast', event: 'cita_actualizada', payload: { id } });
        }
        setEvents(prev => prev.map(ev => 
            ev.id === id ? { 
                ...ev, 
                start: timeStart,
                end: timeEnd,
                extendedProps: { ...ev.extendedProps, estado: newStatus },
                backgroundColor: newStatus === 'pendiente' ? '#3b82f6' : newStatus === 'confirmada' ? '#10b981' : '#64748b'
            } : ev
        ));
        setIsDetailOpen(false);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta cita permanentemente? Esta acción no se puede deshacer.")) return;
    
    console.log("🗑️ Eliminando cita permanentemente...", id);
    const { error } = await supabase.from('citas').delete().eq('id', id);
    
    if (error) {
        alert("Error al eliminar cita: " + error.message);
    } else {
        // EMITIR SEÑAL DE RADIO PARA EL PACIENTE
        if (broadcastChannel) {
            broadcastChannel.send({ type: 'broadcast', event: 'cita_actualizada', payload: { id } });
        }
        setEvents(prev => prev.map(ev => ev.id === id ? null : ev).filter(Boolean) as any);
        setIsDetailOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 lg:p-12 font-montserrat flex flex-col items-center">
      <div className="max-w-7xl w-full space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] -mr-48 -mt-48" />
            <div className="space-y-2 relative z-10">
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent uppercase">
                Consola Maestra de Agenda
              </h1>
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-400/20 px-4 py-1.5 rounded-full uppercase tracking-widest">Sincronizado v3.2</span>
                 <p className="text-slate-500 text-sm font-medium">Gestión de flujo clínico en tiempo real.</p>
              </div>
            </div>
            
            <Button onClick={() => setIsBookingOpen(true)} className="bg-slate-50 hover:bg-white text-slate-950 hover:scale-105 active:scale-95 transition-all rounded-[1.5rem] px-10 py-8 font-black text-lg shadow-2xl relative z-10">
                <Plus className="h-6 w-6 mr-3" /> Agendar Cita
            </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-12">
            <Card className="bg-slate-900/40 backdrop-blur-3xl border-slate-800 rounded-[3.5rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
              <CardContent className="p-0 futuristic-calendar">
                 <CalendarComponent 
                   events={events} 
                   onEventChange={handleEventUpdate} 
                   onEventClick={handleEventClick} 
                 />
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {[
               { label: "CITAS HOY", val: events.length, color: "text-blue-400" },
               { label: "CONFIRMADAS", val: events.filter(e => e.extendedProps.estado === 'confirmada').length, color: "text-emerald-400" },
               { label: "PENDIENTES", val: events.filter(e => e.extendedProps.estado === 'pendiente').length, color: "text-amber-400" },
               { label: "COMPLETADAS", val: events.filter(e => e.extendedProps.estado === 'finalizada').length, color: "text-slate-400" }
             ].map((stat, i) => (
                 <Card key={i} className="bg-slate-900/30 border-slate-800 p-8 rounded-[2.5rem] border-none shadow-sm hover:translate-y-[-5px] transition-all">
                     <p className="text-[10px] font-black tracking-[0.3em] text-slate-500 mb-3 uppercase">{stat.label}</p>
                     <p className={`text-5xl font-black ${stat.color} tracking-tighter`}>{stat.val}</p>
                 </Card>
             ))}
        </footer>
      </div>

      {/* Booking Modal */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="sm:max-w-[520px] bg-[#020617] border border-slate-800 rounded-[2.5rem] p-8 text-slate-200">
           <DialogHeader className="space-y-2 pb-4 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-black font-montserrat tracking-tight text-white uppercase">
                  Agendar Cita
                </DialogTitle>
                <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-400/20 px-3 py-1 rounded-full uppercase tracking-widest">Sistema v3</span>
              </div>
              <DialogDescription className="text-sm font-medium text-slate-500">Completa el registro para bloquear el horario.</DialogDescription>
           </DialogHeader>

           <form onSubmit={handleCreateAppointment} className="space-y-5 py-4">

              {/* Row 1: Sede + Especialista */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-blue-400 ml-1 flex items-center gap-1"><Building2 className="h-3 w-3" /> Sede</label>
                  <div className="relative">
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 transition-all font-bold text-sm text-white appearance-none shadow-inner"
                      value={selectedSedeId}
                      onChange={(e) => handleSedeChange(e.target.value)}
                    >
                      {sedes.length === 0 && <option value="">Sin sedes</option>}
                      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-indigo-400 ml-1 flex items-center gap-1"><Stethoscope className="h-3 w-3" /> Especialista</label>
                  <div className="relative">
                    <select
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-bold text-sm text-white appearance-none shadow-inner"
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                    >
                      {doctors.length === 0 && <option value="">Sin especialistas</option>}
                      {doctors.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 2: Patient Search */}
              <div className="space-y-3">
                 <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Paciente</label>
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 outline-none focus:border-slate-500 transition-all font-bold text-sm placeholder:text-slate-600 shadow-inner"
                      placeholder="Buscar por nombre..."
                      value={searchQuery}
                      onChange={(e) => searchPatients(e.target.value)}
                    />
                    {patients.length > 0 && !selectedPatient && (
                        <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                           {patients.map(p => (
                             <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setSearchQuery(p.nombre); }} className="w-full px-4 py-3 hover:bg-indigo-600/80 text-left font-bold text-sm transition-all flex items-center justify-between">
                                <span>{p.nombre}</span>
                                <span className="text-[9px] text-slate-500">{p.telefono}</span>
                             </button>
                           ))}
                        </div>
                    )}
                 </div>

                 {!selectedPatient && searchQuery.length > 2 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-indigo-600/10 p-4 rounded-2xl border border-indigo-500/20 space-y-2">
                       <div className="flex items-center gap-2 text-indigo-400">
                          <UserPlus className="h-4 w-4" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Nuevo paciente</span>
                       </div>
                       <input
                         required type="tel"
                         className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-bold text-sm transition-all shadow-inner"
                         placeholder="WhatsApp (ej: 5512345678)"
                         value={newApt.telefono_nuevo}
                         onChange={(e) => setNewApt({...newApt, telefono_nuevo: e.target.value})}
                       />
                    </motion.div>
                 )}

                 {selectedPatient && (
                    <div className="bg-emerald-500/10 px-4 py-3 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="font-black text-emerald-100 uppercase text-xs">{selectedPatient.nombre}</span>
                       </div>
                       <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setSearchQuery(""); }} className="h-6 text-[8px] font-black underline text-slate-500 p-0">
                         <X className="h-3 w-3" />
                       </Button>
                    </div>
                 )}
              </div>

              {/* Row 3: Date / Time / Duration */}
              <div className="grid grid-cols-3 gap-3">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Fecha</label>
                    <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-3 font-bold text-sm outline-none focus:border-blue-500 text-white" value={newApt.fecha} onChange={(e) => setNewApt({...newApt, fecha: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Hora</label>
                    <input type="time" className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-3 font-bold text-sm outline-none focus:border-blue-500 text-white" value={newApt.inicio} onChange={(e) => setNewApt({...newApt, inicio: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Duración</label>
                    <div className="relative">
                      <select className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-3 font-bold text-sm outline-none text-white appearance-none" value={newApt.duracion} onChange={(e) => setNewApt({...newApt, duracion: Number(e.target.value)})}>
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>1 hora</option>
                        <option value={90}>1:30 h</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                    </div>
                 </div>
              </div>

              {/* Row 4: Motivo */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Motivo / Síntomas</label>
                <textarea
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 font-bold text-sm outline-none h-20 resize-none shadow-inner focus:border-slate-500 transition-all"
                  placeholder="Detalles de la consulta..."
                  value={newApt.motivo}
                  onChange={(e) => setNewApt({...newApt, motivo: e.target.value})}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={isSubmitting} className="w-full rounded-full py-7 font-black text-lg bg-white text-slate-950 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl">
                   {isSubmitting ? "Sincronizando..." : (selectedPatient ? "✓ Confirmar Reserva" : "Registrar y Agendar")}
                </Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>

      {/* Event Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#020617] border border-slate-800 rounded-[3.5rem] p-12 text-slate-200">
           <DialogHeader className="space-y-4">
              <span className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] w-fit",
                  selectedEvent?.estado === 'pendiente' ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
              )}>
                {selectedEvent?.estado}
              </span>
              <DialogTitle className="text-4xl font-black font-montserrat tracking-tight text-white uppercase">{selectedEvent?.nombre}</DialogTitle>
              <div className="flex items-center gap-4 text-slate-500 pt-2">
                 <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-2xl border border-white/5">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm font-bold">{selectedEvent?.telefono}</span>
                 </div>
                 <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-2xl border border-indigo-500/20 text-indigo-300">
                    <Stethoscope className="h-4 w-4" />
                    <span className="text-sm font-bold">{selectedEvent?.doctorNom}</span>
                 </div>
              </div>
           </DialogHeader>

           <div className="py-8 space-y-6">
              <div className="bg-slate-950/80 p-8 rounded-[2.5rem] border border-slate-800 shadow-inner min-h-[150px] relative">
                 <MessageSquare className="absolute top-6 right-6 h-5 w-5 text-slate-800" />
                 <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Síntomas / Observaciones</p>
                 <p className="text-lg font-medium text-slate-200 leading-relaxed italic">
                    "{selectedEvent?.motivo || "Sin observaciones registradas"}"
                 </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={() => updateStatus(selectedEvent.id, 'confirmada')} className="rounded-3xl py-8 font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/10 text-lg">Confirmar</Button>
                  <Button onClick={() => updateStatus(selectedEvent.id, 'finalizada')} className="rounded-3xl py-8 font-black bg-slate-800 hover:bg-slate-700 text-slate-400 text-lg">Finalizar</Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Button onClick={() => updateStatus(selectedEvent.id, 'cancelada')} variant="outline" className="rounded-3xl py-8 font-black border-2 border-rose-500/20 text-rose-500 hover:bg-rose-500/5 text-lg">Cancelar Cita (Mantener Registro)</Button>
                  <Button onClick={() => deleteAppointment(selectedEvent.id)} variant="ghost" className="rounded-3xl py-6 font-black text-rose-600/40 hover:text-rose-600 hover:bg-rose-600/5 uppercase text-xs tracking-widest gap-3">
                     <Trash2 className="h-4 w-4" /> Eliminar Permanentemente de la Base de Datos
                  </Button>
                </div>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .futuristic-calendar .fc { border: none !important; font-family: 'Montserrat', sans-serif !important; }
        .futuristic-calendar .fc-header-toolbar { padding: 2rem !important; margin-bottom: 0 !important; background: rgba(15, 23, 42, 0.4); }
        .futuristic-calendar .fc-button { background: rgba(30, 41, 59, 0.5) !important; border: 1px solid rgba(255,255,255,0.05) !important; font-weight: 900 !important; text-transform: uppercase !important; font-size: 10px !important; letter-spacing: 0.1em !important; border-radius: 1rem !important; padding: 0.8rem 1.5rem !important; }
        .futuristic-calendar .fc-button-active { background: #3b82f6 !important; }
        .futuristic-calendar .fc-col-header-cell { padding: 1.5rem !important; background: rgba(2, 6, 23, 0.2); }
        .futuristic-calendar .fc-col-header-cell-cushion { font-weight: 900 !important; font-size: 11px !important; text-transform: uppercase !important; color: #64748b !important; letter-spacing: 0.2em !important; }
        .futuristic-calendar .fc-daygrid-day { border: 1px solid rgba(255,255,255,0.03) !important; }
        .futuristic-calendar .fc-day-today { background: rgba(59, 130, 246, 0.05) !important; }
        .futuristic-calendar .fc-event { border-radius: 12px !important; border: none !important; padding: 4px 8px !important; font-weight: 800 !important; font-size: 11px !important; margin: 2px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important; }
      `}</style>
    </div>
  );
}
