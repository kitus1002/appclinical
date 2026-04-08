"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Clock, 
  User,
  Search,
  Filter,
  Loader2,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function FinanzasPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPorCobrar: 0,
    ingresosHoy: 0,
    ingresosMes: 0,
    creditosActivos: 0
  });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [activeCredits, setActiveCredits] = useState<any[]>([]);
  
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setLoading(false);
        return;
    }

    try {
        // 1. Fetch EVERYTHING separately for maximum reliability
        const [
            { data: rawCredits, error: cErr },
            { data: rawPayments, error: pErr },
            { data: rawPatients, error: ptErr }
        ] = await Promise.all([
            supabase.from('creditos').select('*').eq('doctor_id', user.id),
            supabase.from('pagos_credito').select('*, creditos!inner(id, doctor_id)').eq('creditos.doctor_id', user.id).order('fecha_pago', { ascending: false }),
            supabase.from('pacientes').select('id, nombre, limite_credito').eq('doctor_id', user.id)
        ]);

        if (cErr) throw cErr;
        if (pErr) throw pErr;
        if (ptErr) throw ptErr;

        // 2. Manual Map (JavaScript)
        // Patient Map for quick lookup
        const patientMap = (rawPatients || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});

        // Process Credits with Patient names
        const processedCredits = (rawCredits || []).map(c => ({
            ...c,
            pacientes: patientMap[c.paciente_id] || { nombre: "Paciente Desconocido" }
        }));

        // Process Payments with Credit/Patient names
        const processedPayments = (rawPayments || []).map(p => {
            const relatedCredit = processedCredits.find(c => c.id === p.credito_id);
            return {
                ...p,
                creditos: relatedCredit || { pacientes: { nombre: "Venta Directa" } }
            };
        });

        // 3. Calculate Stats
        const active = processedCredits.filter(c => c.estado === 'vigente');
        const totalPending = active.reduce((acc, curr) => acc + Number(curr.saldo_pendiente), 0);

        const todayDate = new Date().toISOString().split('T')[0];
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        const incomeToday = processedPayments
            .filter(p => p.fecha_pago.startsWith(todayDate))
            .reduce((acc, curr) => acc + Number(curr.monto_pagado), 0);
            
        const incomeMonth = processedPayments
            .filter(p => p.fecha_pago >= startOfMonth)
            .reduce((acc, curr) => acc + Number(curr.monto_pagado), 0);

        setStats({
            totalPorCobrar: totalPending,
            ingresosHoy: incomeToday,
            ingresosMes: incomeMonth,
            creditosActivos: active.length
        });

        setActiveCredits(active);
        setRecentPayments(processedPayments.slice(0, 15));

    } catch (err) {
        console.error("CRITICAL FINANCE ERROR:", err);
    } finally {
        setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="font-bold text-slate-400">Calculando estados financieros...</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-5xl font-black font-montserrat tracking-tight text-slate-950 uppercase italic underline decoration-blue-600 decoration-8 underline-offset-8">Reporte Financiero</h1>
          <p className="text-slate-500 font-bold mt-4 uppercase tracking-[0.2em] text-xs">Análisis de Capital y Cartera de Pacientes</p>
        </div>
        <div className="bg-emerald-500 text-white px-8 py-4 rounded-[2rem] border-4 border-emerald-600 shadow-xl flex items-center gap-4 animate-pulse-glow">
           <div className="h-4 w-4 rounded-full bg-white animate-ping" />
           <span className="text-sm font-black uppercase tracking-widest leading-none">Datos en Vivo</span>
        </div>
      </div>

      {/* High-Impact Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-8 shadow-2xl hover:border-blue-600 transition-all group relative overflow-hidden">
            {/* Hover Detail */}
            <div className="absolute inset-0 bg-blue-600 p-8 flex flex-col justify-center translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-20">
                <p className="text-white font-black uppercase tracking-widest text-[10px] mb-4">Detalle de Cartera</p>
                <div className="space-y-3">
                    <div className="flex justify-between border-b border-white/20 pb-2">
                        <span className="text-white/70 text-[10px] font-bold">Pacientes</span>
                        <span className="text-white font-black">{stats.creditosActivos}</span>
                    </div>
                    <p className="text-white/60 text-[9px] font-medium leading-tight mt-2">Esta es la suma total de dinero que tus pacientes te deben actualmente.</p>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="h-16 w-16 rounded-[1.5rem] bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Wallet className="h-8 w-8" />
                </div>
                <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-blue-200 tracking-widest">Cartera</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-montserrat relative z-10">Por Cobrar (Pendiente)</p>
            <h3 className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums relative z-10">${stats.totalPorCobrar.toLocaleString()}</h3>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-8 shadow-2xl hover:border-emerald-600 transition-all group relative overflow-hidden">
            {/* Hover Detail */}
            <div className="absolute inset-0 bg-emerald-600 p-8 flex flex-col justify-center translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-20">
                <p className="text-white font-black uppercase tracking-widest text-[10px] mb-4">Cierre de hoy</p>
                <div className="space-y-3">
                    <div className="flex justify-between border-b border-white/20 pb-2">
                        <span className="text-white/70 text-[10px] font-bold">Efectivo</span>
                        <span className="text-white font-black">${recentPayments.filter(p => p.metodo_pago === 'efectivo' && p.fecha_pago.startsWith(new Date().toISOString().split('T')[0])).reduce((a,c) => a + Number(c.monto_pagado), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/20 pb-2">
                        <span className="text-white/70 text-[10px] font-bold">Tarjeta</span>
                        <span className="text-white font-black">${recentPayments.filter(p => p.metodo_pago !== 'efectivo' && p.fecha_pago.startsWith(new Date().toISOString().split('T')[0])).reduce((a,c) => a + Number(c.monto_pagado), 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <ArrowUpRight className="h-8 w-8" />
                </div>
                <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-emerald-200 tracking-widest">HOY</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-montserrat relative z-10">Ingresos del Día</p>
            <h3 className="text-5xl font-black text-emerald-600 tracking-tighter tabular-nums relative z-10">${stats.ingresosHoy.toLocaleString()}</h3>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-8 shadow-2xl hover:border-violet-600 transition-all group relative overflow-hidden">
            {/* Hover Detail */}
            <div className="absolute inset-0 bg-violet-600 p-8 flex flex-col justify-center translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-20">
                <p className="text-white font-black uppercase tracking-widest text-[10px] mb-4">Resumen Mensual</p>
                <div className="space-y-3">
                    <div className="flex justify-between border-b border-white/20 pb-2">
                        <span className="text-white/70 text-[10px] font-bold">Meta</span>
                        <span className="text-white font-black">---</span>
                    </div>
                    <p className="text-white/60 text-[9px] font-medium leading-tight mt-2">Acumulado total de cobros realizados desde el primer día del mes.</p>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="h-16 w-16 rounded-[1.5rem] bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all">
                    <TrendingUp className="h-8 w-8" />
                </div>
                <span className="bg-violet-100 text-violet-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-violet-200 tracking-widest">Mensual</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-montserrat relative z-10">Recaudado Mes</p>
            <h3 className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums relative z-10">${stats.ingresosMes.toLocaleString()}</h3>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-8 shadow-2xl hover:border-amber-600 transition-all group relative overflow-hidden">
            {/* Hover Detail */}
            <div className="absolute inset-0 bg-amber-600 p-8 flex flex-col justify-center translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-20">
                <p className="text-white font-black uppercase tracking-widest text-[10px] mb-4">Pacientes con Deuda</p>
                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                    {activeCredits.slice(0, 5).map((c, i) => (
                        <div key={i} className="flex justify-between border-b border-white/20 pb-1">
                            <span className="text-white font-bold text-[10px] uppercase truncate flex-1 mr-2">{c.pacientes?.nombre}</span>
                            <span className="text-white/80 font-black text-[9px]">${Number(c.saldo_pendiente).toLocaleString()}</span>
                        </div>
                    ))}
                    {activeCredits.length > 5 && (
                        <p className="text-white/60 text-[8px] font-black uppercase mt-2">Y {activeCredits.length - 5} más...</p>
                    )}
                </div>
                <p className="text-white/60 text-[9px] font-medium leading-tight mt-4 italic border-t border-white/10 pt-2">Lista de expedientes con saldo mayor a cero.</p>
            </div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="h-16 w-16 rounded-[1.5rem] bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all">
                    <Clock className="h-8 w-8" />
                </div>
                <span className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-amber-200 tracking-widest">Activos</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-montserrat relative z-10">Créditos Abiertos</p>
            <h3 className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums relative z-10">{stats.creditosActivos}</h3>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-slate-950 p-12 rounded-[4rem] border-4 border-slate-800 shadow-3xl relative overflow-hidden group">
         <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent pointer-events-none" />
         <div className="flex flex-col lg:flex-row justify-between items-center gap-12 relative z-10">
            <div className="space-y-4 text-center lg:text-left">
               <h2 className="text-4xl font-black uppercase tracking-tighter text-white italic">Arqueo Diario de Caja</h2>
               <div className="flex items-center gap-4 justify-center lg:justify-start">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cierre Estimado al {format(new Date(), "PPP", { locale: es })}</p>
               </div>
            </div>
            <div className="flex flex-col md:flex-row gap-8 w-full lg:w-auto">
               <div className="bg-white/5 p-10 rounded-[3rem] border-2 border-emerald-500/30 flex flex-col items-center md:items-start gap-4 min-w-[280px] hover:bg-emerald-500/10 transition-all">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                     <DollarSign className="h-8 w-8" />
                  </div>
                  <div>
                     <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Total Efectivo</p>
                     <p className="text-4xl font-black text-white tabular-nums">${recentPayments.filter(p => p.metodo_pago === 'efectivo' && p.fecha_pago.startsWith(new Date().toISOString().split('T')[0])).reduce((a,c) => a + Number(c.monto_pagado), 0).toLocaleString()}</p>
                  </div>
               </div>
               <div className="bg-white/5 p-10 rounded-[3rem] border-2 border-blue-500/30 flex flex-col items-center md:items-start gap-4 min-w-[280px] hover:bg-blue-500/10 transition-all">
                  <div className="h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                     <CreditCard className="h-8 w-8" />
                  </div>
                  <div>
                     <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tarjeta / Transf.</p>
                     <p className="text-4xl font-black text-white tabular-nums">${recentPayments.filter(p => p.metodo_pago !== 'efectivo' && p.fecha_pago.startsWith(new Date().toISOString().split('T')[0])).reduce((a,c) => a + Number(c.monto_pagado), 0).toLocaleString()}</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent PaymentsTable */}
        <Card className="lg:col-span-2 rounded-[3rem] border-2 border-slate-200 shadow-2xl overflow-hidden bg-white">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-2xl font-black flex items-center gap-2 uppercase italic text-slate-900 border-b-2 border-slate-100 pb-4">
               Últimos Cobros Realizados
            </CardTitle>
            <CardDescription className="font-bold text-slate-400">Resumen de los últimos 15 movimientos.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50 border-y border-slate-200">
                         <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Paciente</th>
                         <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Monto de Pago</th>
                         <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Método</th>
                         <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Fecha / Hora</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {recentPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-[12px] font-black text-white shadow-md">{p.creditos?.pacientes?.nombre?.[0] || 'P'}</div>
                                 <p className="font-black text-slate-900 text-sm tracking-tight uppercase">{p.creditos?.pacientes?.nombre || "Venta Directa"}</p>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <span className="font-black text-emerald-600 tracking-tighter text-2xl tabular-nums">${p.monto_pagado.toLocaleString()}</span>
                           </td>
                           <td className="px-8 py-6">
                              <span className="text-[10px] font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-xl shadow-sm">{p.metodo_pago}</span>
                           </td>
                           <td className="px-8 py-6 text-xs text-slate-500 font-bold">
                              {format(new Date(p.fecha_pago), "d 'de' MMM, HH:mm", { locale: es })}
                           </td>
                        </tr>
                      ))}
                      {recentPayments.length === 0 && (
                        <tr>
                           <td colSpan={4} className="py-24 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Sin registros recientes</td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </CardContent>
        </Card>

        {/* Pending Debt Sidebar */}
        <Card className="rounded-[3rem] border-2 border-slate-900 shadow-2xl bg-slate-950 text-white overflow-hidden flex flex-col hover:border-blue-600 transition-all duration-500">
           <CardHeader className="p-8">
              <CardTitle className="text-2xl font-black flex items-center gap-2 uppercase italic text-white pb-4 border-b border-white/10">
                 Mayores Deudores
              </CardTitle>
              <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px] pt-4">Ranking de cartera activa</CardDescription>
           </CardHeader>
           <CardContent className="p-8 pt-0 flex-1 space-y-4">
              {activeCredits.sort((a,b) => b.saldo_pendiente - a.saldo_pendiente).slice(0, 8).map((c) => (
                <div key={c.id} className="bg-white/5 p-6 rounded-[2rem] border border-white/10 flex flex-col gap-4 group/item hover:bg-white/10 transition-all">
                   <div className="flex justify-between items-start">
                      <div>
                         <p className="font-black text-sm tracking-tighter leading-none uppercase text-white group-hover/item:text-blue-400 transition-colors">{c.pacientes?.nombre}</p>
                         <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">Límite: ${Number(c.pacientes?.limite_credito || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-rose-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black border-2 border-rose-600 shadow-lg shadow-rose-500/20">DEUDA</div>
                   </div>
                   <div className="flex justify-between items-end">
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Saldo Pendiente</p>
                         <p className="text-3xl font-black leading-none text-white tabular-nums">${Number(c.saldo_pendiente).toLocaleString()}</p>
                      </div>
                      <button className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-slate-900 shadow-xl hover:scale-110 active:scale-95 transition-all">
                         <ArrowUpRight className="h-6 w-6" />
                      </button>
                   </div>
                </div>
              ))}
              {activeCredits.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 opacity-20">
                   <CreditCard className="h-16 w-16" />
                   <p className="text-xs font-black uppercase tracking-widest">Sin deudas activas</p>
                </div>
              )}
           </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, desc, icon: Icon, trend }: any) {
  return (
    <Card className="rounded-[2.5rem] border-border/40 shadow-lg hover:shadow-xl transition-all group">
      <CardHeader className="p-8 pb-3">
        <div className="flex justify-between items-start">
           <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
              <Icon className="h-7 w-7" />
           </div>
           {trend === 'up' && <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-500/20">POSTIVO</span>}
           {trend === 'pendiente' && <span className="bg-indigo-500/10 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-500/20">CARTERA</span>}
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black tracking-tighter mb-1 select-none">{value}</h3>
        <p className="text-xs text-muted-foreground font-medium">{desc}</p>
      </CardContent>
    </Card>
  );
}

function ReceiptIcon(props: any) {
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
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <path d="M12 17.5V6.5" />
        </svg>
    )
}
