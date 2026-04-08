"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  ShoppingCart, 
  User, 
  Plus, 
  Trash2, 
  DollarSign, 
  CreditCard, 
  Receipt,
  CheckCircle2,
  Loader2,
  PlusCircle,
  TrendingUp
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
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from "date-fns";
import { es } from "date-fns/locale";

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  section: { marginBottom: 20, borderBottom: 1, borderColor: '#EEE', paddingBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 10, color: '#666' },
  value: { fontSize: 12, fontWeight: 'bold' },
  totalRow: { marginTop: 10, paddingTop: 10, borderTop: 2, borderColor: '#000' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' }
});

const CortePDF = ({ summary, doctor }: any) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>CORTE DE CAJA DIARIO</Text>
      <View style={pdfStyles.section}>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Doctor:</Text>
          <Text style={pdfStyles.value}>{doctor?.nombre}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Fecha:</Text>
          <Text style={pdfStyles.value}>{format(new Date(), 'PPP', { locale: es })}</Text>
        </View>
      </View>
      <View style={pdfStyles.section}>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>EFECTIVO RECAUDADO:</Text>
          <Text style={pdfStyles.value}>${summary.efectivo.toLocaleString()}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>TARJETA / TRANSF.:</Text>
          <Text style={pdfStyles.value}>${summary.tarjeta.toLocaleString()}</Text>
        </View>
        <View style={[pdfStyles.row, pdfStyles.totalRow]}>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>TOTAL LIQUIDADO:</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>${(summary.efectivo + summary.tarjeta).toLocaleString()}</Text>
        </View>
      </View>
      <View style={pdfStyles.section}>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>NUEVOS CRÉDITOS (DEUDA):</Text>
          <Text style={pdfStyles.value}>${summary.creditosNuevos.toLocaleString()}</Text>
        </View>
      </View>
      <View style={{ marginTop: 50, borderTop: 1, borderColor: '#000', width: 200, alignSelf: 'center', paddingTop: 10 }}>
        <Text style={{ textAlign: 'center', fontSize: 10 }}>Firma del Responsable</Text>
      </View>
      <Text style={pdfStyles.footer}>Reporte generado por NeoMed Pro v2.0 - {new Date().toLocaleString()}</Text>
    </Page>
  </Document>
);

export default function CajaPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [searchPatient, setSearchPatient] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientDebt, setPatientDebt] = useState<number>(0);
  const [cart, setCart] = useState<any[]>([]);
  const [abonoAmount, setAbonoAmount] = useState<string>("0");
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>("0");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCorteOpen, setIsCorteOpen] = useState(false);
  const [corteSummary, setCorteSummary] = useState({ efectivo: 0, tarjeta: 0, creditosNuevos: 0 });
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  
  // Custom Service State
  const [customService, setCustomService] = useState({ nombre: "", precio: "" });

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: p } = await supabase.from('pacientes').select('id, nombre, limite_credito');
    const { data: c } = await supabase.from('servicios_catalogo').select('*');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: doc } = await supabase.from('doctores').select('*').eq('user_id', user.id).single();
        if (doc) setDoctorInfo(doc);
    }
    if (p) setPatients(p);
    if (c) setCatalog(c);
    setLoading(false);
  };

  const calculateCorte = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    // Today's payments (Efectivo)
    const { data: pCash } = await supabase.from('pagos_credito')
        .select('monto_pagado, creditos!inner(doctor_id)')
        .eq('metodo_pago', 'efectivo')
        .eq('creditos.doctor_id', user.id)
        .gte('fecha_pago', today);

    // Today's payments (Tarjeta)
    const { data: pCard } = await supabase.from('pagos_credito')
        .select('monto_pagado, creditos!inner(doctor_id)')
        .neq('metodo_pago', 'efectivo')
        .eq('creditos.doctor_id', user.id)
        .gte('fecha_pago', today);

    // New Credits
    const { data: newC } = await supabase.from('creditos')
        .select('monto_inicial')
        .eq('doctor_id', user.id)
        .eq('estado', 'vigente')
        .gte('created_at', today);

    setCorteSummary({
        efectivo: (pCash || []).reduce((acc, curr) => acc + Number(curr.monto_pagado), 0),
        tarjeta: (pCard || []).reduce((acc, curr) => acc + Number(curr.monto_pagado), 0),
        creditosNuevos: (newC || []).reduce((acc, curr) => acc + Number(curr.monto_inicial), 0)
    });
    setLoading(false);
    setIsCorteOpen(true);
  };

  const handleSelectPatient = async (p: any) => {
    setSelectedPatient(p);
    setSearchPatient("");
    // Fetch debt
    const { data } = await supabase.from('creditos').select('saldo_pendiente').eq('paciente_id', p.id).eq('estado', 'vigente');
    if (data) {
        setPatientDebt(data.reduce((acc: number, curr: any) => acc + Number(curr.saldo_pendiente), 0));
    }
  };

  const addToCart = (service: any) => {
    const existing = cart.find(item => item.id === service.id);
    if (existing) {
      setCart(cart.map(item => item.id === service.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCart([...cart, { ...service, cantidad: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.cantidad + delta);
        return { ...item, cantidad: newQty };
      }
      return item;
    }).filter(item => item.cantidad > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((acc, curr) => acc + (Number(curr.precio) * curr.cantidad), 0);

  const handleCheckout = async (metodo: string) => {
    if (!selectedPatient || cart.length === 0) return;
    setSubmitting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (metodo === 'credito') {
        const { error } = await supabase.from('creditos').insert({
            paciente_id: selectedPatient.id,
            doctor_id: user.id,
            monto_inicial: total,
            tasa_interes: 0,
            total_con_interes: total,
            saldo_pendiente: total, // Deuda completa
            notas: "Venta a Crédito (Caja): " + cart.map(i => `${i.nombre} x${i.cantidad}`).join(", "),
            estado: 'vigente'
        });
        if (error) { alert(error.message); setSubmitting(false); return; }
    } else {
        // 1. Crear el crédito (venta) ya liquidada
        const { data: credit, error: cError } = await supabase.from('creditos').insert({
          paciente_id: selectedPatient.id,
          doctor_id: user.id,
          monto_inicial: total,
          tasa_interes: 0,
          total_con_interes: total,
          saldo_pendiente: 0, // Pagado al instante
          notas: "Venta de Caja: " + cart.map(i => `${i.nombre} x${i.cantidad}`).join(", "),
          estado: 'liquidado'
        }).select().single();

        if (cError) {
          alert("Error: " + cError.message);
          setSubmitting(false);
          return;
        }

        // 2. Registrar el pago
        await supabase.from('pagos_credito').insert({
            credito_id: credit.id,
            monto_pagado: total,
            metodo_pago: metodo,
            tipo_pago: 'liquidacion'
        });
    }

    setSubmitting(false);
    setCart([]);
    setSelectedPatient(null);
    setPatientDebt(0);
    setAbonoAmount("0");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    fetchData();
  };

  const handlePayAccount = async (metodo: string) => {
    const amount = Number(abonoAmount);
    if (!selectedPatient || amount <= 0) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get all vigente credits for the patient
    const { data: vCredits } = await supabase.from('creditos')
        .select('*')
        .eq('paciente_id', selectedPatient.id)
        .eq('estado', 'vigente')
        .order('created_at', { ascending: true });

    if (!vCredits || vCredits.length === 0) {
        alert("El paciente no tiene deudas vigentes.");
        setSubmitting(false);
        return;
    }

    let remainingPayment = amount;

    for (const credit of vCredits) {
        if (remainingPayment <= 0) break;

        const currentDebt = Number(credit.saldo_pendiente);
        const paymentForThis = Math.min(remainingPayment, currentDebt);
        const newSaldo = currentDebt - paymentForThis;

        // Update Credit
        await supabase.from('creditos').update({
            saldo_pendiente: newSaldo,
            estado: newSaldo <= 0 ? 'liquidado' : 'vigente'
        }).eq('id', credit.id);

        // Register Payment Record
        await supabase.from('pagos_credito').insert({
            credito_id: credit.id,
            monto_pagado: paymentForThis,
            metodo_pago: metodo,
            tipo_pago: newSaldo <= 0 ? 'liquidacion' : 'abono'
        });

        remainingPayment -= paymentForThis;
    }

    setSubmitting(false);
    setAbonoAmount("0");
    setSelectedPatient(null);
    setPatientDebt(0);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    fetchData();
  };

  const filteredPatients = patients.filter(p => p.nombre.toLowerCase().includes(searchPatient.toLowerCase()));

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="font-bold text-slate-400">Iniciando terminal de cobro...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black font-montserrat tracking-tight uppercase italic underline decoration-primary">Punto de Venta (CAJA)</h1>
          <p className="text-muted-foreground font-medium">Registra cobros directos de consultas y servicios.</p>
        </div>
        <Button onClick={calculateCorte} className="bg-slate-900 border-2 border-primary/20 text-white rounded-full py-8 px-10 font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl gap-3 animate-pulse-glow">
           <Receipt className="h-6 w-6" /> CORTE DE CAJA
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        {/* Step 1: Select Patient & Services */}
        <div className="lg:col-span-2 space-y-8">
           <Card className="rounded-[3rem] border-border/40 shadow-xl bg-white/50 backdrop-blur-md">
              <CardHeader className="p-8">
                 <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" /> 1. Identificar Paciente
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input 
                      disabled={!!selectedPatient}
                      className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl focus:border-primary outline-none font-bold text-slate-900 placeholder:text-slate-400"
                      placeholder="Buscar paciente por nombre..."
                      value={searchPatient}
                      onChange={(e) => setSearchPatient(e.target.value)}
                    />
                 </div>
                 
                  {!selectedPatient && searchPatient.length > 2 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                       {filteredPatients.map(p => (
                          <button key={p.id} onClick={() => handleSelectPatient(p)} className="w-full p-4 flex items-center justify-between bg-white border border-border/50 rounded-2xl hover:border-primary transition-all group">
                             <span className="font-black text-slate-900">{p.nombre}</span>
                             <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                       ))}
                    </div>
                 )}

                  {selectedPatient && (
                    <div className="bg-primary/10 p-6 rounded-[2rem] border border-primary/20 flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in zoom-in-95">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/20">{selectedPatient.nombre[0]}</div>
                          <div>
                             <p className="font-black text-slate-900 leading-none text-xl mb-1">{selectedPatient.nombre}</p>
                             <p className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border inline-block", patientDebt > 0 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500")}>
                                 {patientDebt > 0 ? `DEUDA ACTUAL: $${patientDebt.toLocaleString()}` : "SIN DEUDA PENDIENTE"}
                             </p>
                             {Number(selectedPatient?.limite_credito || 0) > 0 && (
                                <div className="flex gap-2 mt-2">
                                    <span className="text-[9px] font-black uppercase bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-md border border-blue-500/20">Límite: ${Number(selectedPatient.limite_credito).toLocaleString()}</span>
                                    <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-md border", (Number(selectedPatient.limite_credito) - patientDebt) > 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20")}>
                                        Disponible: ${(Number(selectedPatient.limite_credito) - patientDebt).toLocaleString()}
                                    </span>
                                </div>
                             )}
                          </div>
                       </div>
                       <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setPatientDebt(0); }} className="text-xs font-black uppercase tracking-[0.2em] text-primary/60 hover:text-primary transition-colors">Cambiar Paciente</Button>
                    </div>
                 )}

                  {selectedPatient && patientDebt > 0 && cart.length === 0 && (
                     <div className="mt-8 p-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-[3rem] shadow-2xl shadow-amber-500/30 text-white animate-in zoom-in-95 duration-500">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                           <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                 <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                                    <TrendingUp className="h-6 w-6 text-white" />
                                 </div>
                                 <h3 className="text-2xl font-black uppercase tracking-tighter italic">Abonar al Crédito</h3>
                              </div>
                              <p className="text-white/80 font-medium text-sm">El paciente tiene una deuda de <span className="font-black text-white underline">${patientDebt.toLocaleString()}</span>. Ingresa el monto a pagar:</p>
                           </div>
                           <div className="flex-1 max-w-xs w-full">
                              <div className="relative group">
                                 <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 text-white/50 group-focus-within:text-white transition-colors" />
                                 <input 
                                    type="number"
                                    className="w-full bg-white/10 border-2 border-white/20 rounded-2xl py-6 pl-14 pr-6 text-3xl font-black text-white outline-none focus:border-white focus:bg-white/20 transition-all placeholder:text-white/30"
                                    placeholder="0.00"
                                    value={abonoAmount}
                                    onChange={(e) => setAbonoAmount(e.target.value)}
                                 />
                              </div>
                           </div>
                           <div className="flex flex-col gap-2 w-full md:w-auto">
                              <Button 
                                 onClick={() => handlePayAccount("efectivo")}
                                 disabled={submitting || Number(abonoAmount) <= 0}
                                 className="bg-white text-amber-600 hover:bg-slate-100 py-8 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all"
                              >
                                 Pagar en Efectivo
                              </Button>
                              <Button 
                                 onClick={() => handlePayAccount("tarjeta")}
                                 disabled={submitting || Number(abonoAmount) <= 0}
                                 className="bg-amber-950/20 text-white border border-white/20 hover:bg-amber-950/30 py-4 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest"
                              >
                                 Pagar con Tarjeta
                              </Button>
                           </div>
                        </div>
                     </div>
                  )}
              </CardContent>
           </Card>

            <Card className="rounded-[3rem] border-border/40 shadow-xl bg-slate-50">
               <CardHeader className="p-8">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                     <PlusCircle className="h-5 w-5 text-emerald-500" /> Cobro Directo (Servicio Libre)
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-8 pt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Concepto / Servicio</label>
                        <input 
                           className="w-full p-4 bg-white border border-border/50 rounded-2xl outline-none focus:border-emerald-500 font-bold text-slate-900 placeholder:text-slate-400"
                           placeholder="Ej: Consulta Especialidad..."
                           value={customService.nombre}
                           onChange={(e) => setCustomService({...customService, nombre: e.target.value})}
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Monto ($)</label>
                        <input 
                           type="number"
                           className="w-full p-4 bg-white border border-border/50 rounded-2xl outline-none focus:border-emerald-500 font-black text-xl text-emerald-600 placeholder:text-emerald-200"
                           placeholder="0.00"
                           value={customService.precio}
                           onChange={(e) => setCustomService({...customService, precio: e.target.value})}
                        />
                     </div>
                  </div>
                  <Button 
                    onClick={() => {
                        if (!customService.nombre || !customService.precio) return;
                        addToCart({ id: 'custom-' + Date.now(), nombre: customService.nombre, precio: Number(customService.precio) });
                        setCustomService({ nombre: "", precio: "" });
                    }}
                    className="w-full py-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs"
                  >
                    Añadir al Cobro
                  </Button>
               </CardContent>
            </Card>

            <Card className="rounded-[3rem] border-border/40 shadow-xl">
               <CardHeader className="p-8">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                     <ShoppingCart className="h-5 w-5 text-violet-500" /> 3. Selección de Catálogo
                  </CardTitle>
               </CardHeader>
              <CardContent className="p-8 pt-0">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catalog.map(service => (
                       <button key={service.id} onClick={() => addToCart(service)} className="p-5 flex items-center justify-between bg-slate-50 border-2 border-transparent rounded-[2rem] hover:border-violet-500 hover:bg-violet-50 transition-all text-left">
                          <div>
                             <p className="font-black text-slate-800 text-sm leading-tight uppercase">{service.nombre}</p>
                             <p className="text-xs text-slate-500 font-bold mt-1">${service.precio.toLocaleString()}</p>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-violet-600 shadow-sm"><Plus className="h-5 w-5" /></div>
                       </button>
                    ))}
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Checkout Sidebar */}
        <div className="space-y-8 h-full">
           <Card className="rounded-[3rem] border-border/40 shadow-2xl bg-slate-900 text-white flex flex-col sticky top-8">
              <CardHeader className="p-8">
                 <CardTitle className="text-2xl font-black italic tracking-tight">RESUMEN COBRO</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 flex-1 flex flex-col h-full">
                 <div className="flex-1 space-y-6">
                    {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-center group bg-white/5 p-4 rounded-2xl border border-white/5 mb-4">
                           <div className="flex-1">
                              <p className="font-bold text-xs uppercase tracking-tight mb-2">{item.nombre}</p>
                              <div className="flex items-center gap-2">
                                 <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-lg font-bold">-</button>
                                    <input 
                                       type="number" 
                                       className="w-10 bg-transparent text-center font-black text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                       value={item.cantidad}
                                       onFocus={(e) => e.target.select()}
                                       onChange={(e) => {
                                          const val = parseInt(e.target.value) || 1;
                                          updateQuantity(item.id, val - item.cantidad);
                                       }}
                                    />
                                    <button onClick={() => updateQuantity(item.id, 1)} className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-lg font-bold">+</button>
                                 </div>
                                 <span className="text-[10px] text-slate-500 font-bold ml-2">x ${item.precio.toLocaleString()}</span>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="font-black text-sm">${(item.precio * item.cantidad).toLocaleString()}</p>
                              <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 mt-2">
                                 <Trash2 className="h-4 w-4" />
                              </Button>
                           </div>
                        </div>
                     ))}
                    {cart.length === 0 && (
                       <div className="py-12 text-center opacity-30 select-none">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-4" />
                          <p className="text-xs font-black uppercase tracking-widest">Carrito Vacío</p>
                       </div>
                    )}
                 </div>

                 <div className="mt-12 pt-8 border-t border-white/10 space-y-8">
                    <div className="flex justify-between items-end">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-none">Total Neto</span>
                       <span className="text-4xl font-black text-white leading-none tracking-tighter">${total.toLocaleString()}</span>
                    </div>

                    {cart.length > 0 && (
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4 animate-in slide-in-from-bottom-4">
                           <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black uppercase text-slate-400">Recibido (Efectivo)</label>
                              <input 
                                 type="number"
                                 className="w-24 bg-transparent border-b border-white/20 text-right font-black text-xl outline-none focus:border-primary transition-all pr-1"
                                 placeholder="0"
                                 value={efectivoRecibido}
                                 onChange={(e) => setEfectivoRecibido(e.target.value)}
                              />
                           </div>
                           {Number(efectivoRecibido) > total && (
                              <div className="flex justify-between items-center">
                                 <span className="text-[10px] font-black uppercase text-emerald-500">Cambio</span>
                                 <span className="text-2xl font-black text-emerald-500">
                                    ${(Number(efectivoRecibido) - total).toLocaleString()}
                                 </span>
                              </div>
                           )}
                        </div>
                     )}

                    {showSuccess && (
                       <div className="bg-emerald-500 text-white p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                          <CheckCircle2 className="h-5 w-5" />
                          <p className="font-bold text-sm">Pago registrado con éxito.</p>
                       </div>
                    )}
                    <div className="grid grid-cols-1 gap-3">
                        {cart.length > 0 ? (
                           <>
                              <Button 
                                onClick={() => handleCheckout("efectivo")}
                                disabled={submitting || !selectedPatient}
                                className="bg-white text-slate-900 py-8 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                               >
                                 <DollarSign className="h-5 w-5" /> Cobrar Venta (Efectivo)
                              </Button>
                              <Button 
                                onClick={() => handleCheckout("tarjeta")}
                                disabled={submitting || !selectedPatient}
                                className="bg-slate-800 border border-white/10 text-white py-8 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                              >
                                 <CreditCard className="h-5 w-5" /> Cobrar Venta (Tarjeta)
                              </Button>
                              <Button 
                                onClick={() => {
                                   const available = Number(selectedPatient.limite_credito || 0) - patientDebt;
                                   if (total > available && Number(selectedPatient.limite_credito || 0) > 0) {
                                      if (!confirm(`El monto supera el crédito disponible ($${available.toLocaleString()}). ¿Proceder de todos modos?`)) return;
                                   }
                                   handleCheckout("credito");
                                }}
                                disabled={submitting || !selectedPatient}
                                className="bg-amber-600 text-white py-8 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                              >
                                 <CheckCircle2 className="h-5 w-5" /> Enviar a Crédito (Deuda)
                              </Button>
                           </>
                        ) : null}
                     </div>

                     <div className="flex items-center gap-2 justify-center opacity-40">
                        <Receipt className="h-3 w-3" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Generar comprobante digital</span>
                     </div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
 
      <Dialog open={isCorteOpen} onOpenChange={setIsCorteOpen}>
        <DialogContent className="bg-[#020617] border border-slate-800 sm:max-w-md rounded-[3rem] p-12 text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-white">Corte de Caja</DialogTitle>
            <DialogDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{format(new Date(), 'PPP', { locale: es })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-10">
             <div className="flex justify-between items-center p-6 bg-slate-900 rounded-3xl border border-white/5">
                <span className="text-xs font-bold text-slate-400 uppercase">Efectivo en Caja</span>
                <span className="text-2xl font-black text-emerald-500">${corteSummary.efectivo.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center p-6 bg-slate-900 rounded-3xl border border-white/5">
                <span className="text-xs font-bold text-slate-400 uppercase">Tarjeta / Transf.</span>
                <span className="text-2xl font-black text-blue-500">${corteSummary.tarjeta.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center p-6 bg-primary/10 rounded-3xl border border-primary/20">
                <span className="text-xs font-bold text-primary uppercase">Total Liquidado</span>
                <span className="text-3xl font-black text-white">${(corteSummary.efectivo + corteSummary.tarjeta).toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center p-6 border-2 border-dashed border-slate-800 rounded-3xl opacity-60">
                <span className="text-xs font-bold text-slate-500 uppercase">Nuevas Deudas (Crédito)</span>
                <span className="text-xl font-bold text-slate-400">${corteSummary.creditosNuevos.toLocaleString()}</span>
             </div>
          </div>
          <DialogFooter className="flex flex-col gap-4 sm:flex-col">
             <PDFDownloadLink
                document={<CortePDF summary={corteSummary} doctor={doctorInfo} />}
                fileName={`Corte_Caja_${format(new Date(), 'dd_MM_yyyy')}.pdf`}
                className="w-full bg-white text-slate-950 py-8 rounded-full font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl"
             >
                <Receipt className="h-5 w-5" /> DESCARGAR REPORTE PDF
             </PDFDownloadLink>
             <Button variant="ghost" onClick={() => setIsCorteOpen(false)} className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
