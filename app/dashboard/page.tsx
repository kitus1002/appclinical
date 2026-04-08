"use client";

import { useEffect, useState } from "react";
import { 
  createSupabaseBrowser 
} from "@/lib/supabase/client";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Clock, 
  Plus, 
  Phone, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { format, addMinutes, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function LiveDashboard() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    fetchTodayAppointments();

    // Real-time subscription
    const channel = supabase
      .channel('live-appointments')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'citas' }, 
          () => fetchTodayAppointments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTodayAppointments = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('citas')
      .select('*, pacientes(id, nombre, telefono)')
      .eq('fecha', today)
      .order('inicio', { ascending: true });

    if (data) {
      setAppointments(data);
    }
    setLoading(false);
  };

  const sendWhatsApp = (phone: string, name: string, time: string) => {
    const message = `Hola ${name}, te recordamos tu cita de hoy a las ${time}. ¡Te esperamos!`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-montserrat">Monitor en Vivo</h1>
          <p className="text-muted-foreground">Estado actual de la consulta hoy, {format(new Date(), "d 'de' MMMM", { locale: es })}</p>
        </div>
      </div>


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paciente Actual</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.find(a => a.estado === 'en_curso')?.pacientes?.nombre || "Nadie"}
            </div>
            <p className="text-xs text-muted-foreground">En consultorio desde hace 12 min</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Siguiente</CardTitle>
            <Clock className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               {appointments.find(a => a.estado === 'confirmada' && !isPast(new Date(a.inicio)))?.pacientes?.nombre || "Sin citas próximamente"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Cola de Espera</CardTitle>
          <CardDescription>Pacientes agendados para el resto del día.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No hay citas registradas para hoy.</div>
            ) : (
                appointments.map((apt) => (
                    <div key={apt.id} className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                        apt.estado === 'en_curso' ? "bg-primary/10 border-primary" : "bg-secondary/5 border-border/50"
                    )}>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-secondary/80 flex items-center justify-center font-bold">
                                {format(new Date(apt.inicio), "HH:mm")}
                            </div>
                            <div>
                                <p className="font-bold">{apt.pacientes?.nombre}</p>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                                        apt.estado === 'en_curso' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                        apt.estado === 'confirmada' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                        "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                    )}>
                                        {apt.estado}
                                    </span>
                                    {!apt.doctor_id && <span className="text-[10px] text-amber-500 font-bold uppercase italic">Sin Médico</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => sendWhatsApp(apt.pacientes?.telefono, apt.pacientes?.nombre, format(new Date(apt.inicio), "HH:mm"))}
                            >
                                <Phone className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="outline" size="sm">Detalles</Button>
                        </div>
                    </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
