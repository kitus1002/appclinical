"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  History, 
  FileText, 
  DollarSign, 
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  User as UserIcon,
  Plus,
  MapPin,
  AlertCircle,
  CreditCard,
  Receipt,
  PlusCircle,
  TrendingUp,
  Share2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PrescriptionPdf } from "@/components/dashboard/PrescriptionPdf";
import { BudgetPdf } from "@/components/dashboard/BudgetPdf";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<any>(null);
  const [clinicData, setClinicData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("historial");
  const [loading, setLoading] = useState(true);
  const [prescriptionContent, setPrescriptionContent] = useState<string | null>(null);
  
  // Budget State
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [newService, setNewService] = useState({ description: "", price: 0, quantity: 1 });
  
  // Financial State
  const [credits, setCredits] = useState<any[]>([]);
  const [selectedCredit, setSelectedCredit] = useState<any>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [newDoctorId, setNewDoctorId] = useState("");
  
  const [newCredit, setNewCredit] = useState({ monto: 0, interes: 0, notas: "" });
  const [newPayment, setNewPayment] = useState({ monto: 0, metodo: "efectivo", tipo: "abono" });
  
  const [submitting, setSubmitting] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    fetchPatient();
    fetchFinancials();
    fetchDoctors();
  }, [params.id]);

  const fetchDoctors = async () => {
    const { data } = await supabase.from('doctores').select('*');
    if (data) setDoctors(data);
  };

  const fetchFinancials = async () => {
    const { data: cData } = await supabase.from('creditos').select('*').eq('paciente_id', params.id).order('created_at', { ascending: false });
    if (cData) setCredits(cData);
  };

  const fetchPatient = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (data) {
      setPatient(data);
      // Obtener la clínica específica del paciente para la receta
      if (data.consultorio_id) {
        fetchClinic(data.consultorio_id);
      } else {
        fetchClinic(); // Fallback a la primera si no tiene asignada
      }
    }
    setLoading(false);
  };

  const fetchClinic = async (clinicId?: string) => {
    let query = supabase.from('consultorios').select('*');
    if (clinicId) {
      query = query.eq('id', clinicId);
    }
    const { data } = await query.maybeSingle(); // Usamos maybeSingle para evitar errores si no hay ninguna
    if (data) setClinicData(data);
  };

  const handleCreateCredit = async () => {
    if (newCredit.monto <= 0) return;
    setSubmitting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const total = newCredit.monto + (newCredit.monto * (newCredit.interes / 100));
    
    const { error } = await supabase.from('creditos').insert({
      paciente_id: params.id,
      doctor_id: user.id,
      monto_inicial: newCredit.monto,
      tasa_interes: newCredit.interes,
      total_con_interes: total,
      saldo_pendiente: total,
      notas: newCredit.notas
    });

    if (error) alert(error.message);
    else {
      setIsCreditModalOpen(false);
      setNewCredit({ monto: 0, interes: 0, notas: "" });
      fetchFinancials();
    }
    setSubmitting(false);
  };

  const handleTransfer = async () => {
    if (!newDoctorId) return;
    setSubmitting(true);
    
    // Si el paciente no tiene doctor_id (antiguo), se le asigna el nuevo
    // Si ya tenía, se actualiza
    const { error } = await supabase.from('pacientes').update({ doctor_id: newDoctorId }).eq('id', params.id);
    
    if (error) alert(error.message);
    else {
      setIsTransferModalOpen(false);
      fetchPatient();
      alert("Paciente transferido correctamente.");
    }
    setSubmitting(false);
  };

  const handleRegisterPayment = async () => {
    if (newPayment.monto <= 0 || !selectedCredit) return;
    setSubmitting(true);

    const { error: pError } = await supabase.from('pagos_credito').insert({
      credito_id: selectedCredit.id,
      monto_pagado: newPayment.monto,
      metodo_pago: newPayment.metodo,
      tipo_pago: newPayment.tipo
    });

    if (pError) {
      alert(pError.message);
    } else {
      // Update balance
      const newBalance = selectedCredit.saldo_pendiente - newPayment.monto;
      await supabase.from('creditos').update({
        saldo_pendiente: newBalance,
        estado: newBalance <= 0 ? 'liquidado' : 'vigente'
      }).eq('id', selectedCredit.id);

      setIsPaymentModalOpen(false);
      setNewPayment({ monto: 0, metodo: "efectivo", tipo: "abono" });
      fetchFinancials();
    }
    setSubmitting(false);
  };

  if (loading) return <div className="text-center py-20">Cargando perfil...</div>;

  return (
    <div className="space-y-8">
      {/* Header / Profile Card */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pacientes">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-2xl font-bold font-montserrat">Expediente Médico</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 bg-secondary/10">
            <CardHeader className="flex flex-col items-center">
                <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-4xl mb-4 border-2 border-primary/30">
                    {patient?.nombre[0]}
                </div>
                <CardTitle className="text-center text-xl font-bold">{patient?.nombre}</CardTitle>
                <CardDescription className="text-center">Paciente desde: 2024</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-primary" /> {patient?.telefono || "No especificado"}
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-primary" /> {patient?.email || "No especificado"}
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" /> {patient?.fecha_nacimiento ? format(new Date(patient.fecha_nacimiento), 'dd/MM/yyyy') : "Sin fecha"}
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary" /> {patient?.direccion_completa || "Sin dirección"}
                </div>
                <div className="pt-4 border-t border-border/50 space-y-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Contacto de Emergencia</p>
                    <p className="text-sm font-medium">{patient?.contacto_emergencia_nombre || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">{patient?.contacto_emergencia_telefono || ""}</p>
                </div>
                <div className="flex flex-col gap-2 pt-4">
                    <Button className="w-full rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-none">Editar Datos</Button>
                    <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full rounded-full gap-2 border-slate-200">
                                <Share2 className="h-4 w-4" /> Transferir
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl border-border/50">
                            <DialogHeader>
                                <DialogTitle>Transferir Responsabilidad</DialogTitle>
                                <DialogDescription>Cambia el doctor asignado a {patient?.nombre}.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Nuevo Doctor Responsable</label>
                                    <select 
                                      className="w-full p-4 rounded-2xl bg-secondary/20 border border-border/30 outline-none font-bold"
                                      value={newDoctorId}
                                      onChange={(e) => setNewDoctorId(e.target.value)}
                                    >
                                        <option value="">Seleccionar doctor...</option>
                                        {doctors.filter(d => d.id !== patient?.doctor_id).map(d => (
                                            <option key={d.id} value={d.id}>{d.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button className="w-full rounded-2xl" onClick={handleTransfer} disabled={submitting}>
                                    {submitting ? "Transfiriendo..." : "Confirmar Transferencia"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
            {/* Clinical Alerts Banner */}
            {(patient?.alergias || patient?.antecedentes_patologicos) && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-700 text-sm italic underline">Alertas Clínicas</h4>
                  {patient?.alergias && <p className="text-sm text-red-600"><strong>Alergias:</strong> {patient.alergias}</p>}
                  {patient?.antecedentes_patologicos && <p className="text-sm text-red-600"><strong>Antecedentes:</strong> {patient.antecedentes_patologicos}</p>}
                </div>
              </div>
            )}
            {/* Tabs */}
            <div className="flex p-1 bg-secondary/30 rounded-2xl w-fit">
                <button 
                  onClick={() => setActiveTab("historial")}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === "historial" ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                    <History className="h-4 w-4" /> Historial
                </button>
                <button 
                  onClick={() => setActiveTab("recetas")}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === "recetas" ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                    <FileText className="h-4 w-4" /> Recetas
                </button>
                 <button 
                   onClick={() => setActiveTab("presupuestos")}
                   className={cn(
                     "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                     activeTab === "presupuestos" ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:text-foreground"
                   )}
                 >
                     <DollarSign className="h-4 w-4" /> Presupuestos
                 </button>
                 <button 
                   onClick={() => setActiveTab("finanzas")}
                   className={cn(
                     "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                     activeTab === "finanzas" ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:text-foreground"
                   )}
                 >
                     <CreditCard className="h-4 w-4" /> Finanzas
                 </button>
             </div>

            {/* Tab Contents */}
            <div className="min-h-[400px]">
                {activeTab === "historial" && (
                    <Card className="border-none bg-transparent shadow-none">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-montserrat">Notas Evolutivas</h3>
                            <Button size="sm" className="rounded-full flex items-center gap-1">
                                <Plus className="h-4 w-4" /> Nueva Nota
                            </Button>
                        </div>
                        <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/50">
                            {[1, 2].map((note) => (
                                <div key={note} className="pl-10 relative">
                                    <div className="absolute left-[2px] top-2 h-4 w-4 rounded-full bg-primary border-4 border-background" />
                                    <Card className="glass">
                                        <CardHeader className="py-3">
                                            <div className="flex justify-between">
                                                <span className="text-xs font-bold text-primary">15 DE MAYO, 2024</span>
                                                <span className="text-xs text-muted-foreground italic">Dr. García</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="text-sm prose prose-invert max-w-none">
                                            Paciente presenta molestia en el segundo molar inferior izquierdo. Se realiza limpieza y se prescribe ibuprofeno para la inflamación. Próxima visita en 15 días.
                                        </CardContent>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {activeTab === "recetas" && (
                    <Card className="border-none bg-transparent shadow-none">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-montserrat">Recetas y Órdenes</h3>
                            <Button 
                              onClick={() => setPrescriptionContent("Receta para: " + patient.nombre)}
                              size="sm" 
                              className="rounded-full flex items-center gap-1"
                            >
                                <Plus className="h-4 w-4" /> Nueva Receta
                            </Button>
                        </div>
                        
                        {prescriptionContent !== null ? (
                          <div className="space-y-4">
                            <textarea 
                              className="w-full p-4 rounded-2xl bg-secondary/20 border border-border/50 min-h-[200px] outline-none focus:ring-2 focus:ring-primary"
                              value={prescriptionContent}
                              onChange={(e) => setPrescriptionContent(e.target.value)}
                              placeholder="Describe el tratamiento y las indicaciones..."
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setPrescriptionContent(null)}>Cancelar</Button>
                                {clinicData && (
                                  <PDFDownloadLink 
                                    document={<PrescriptionPdf 
                                        clinic={clinicData} 
                                        patient={patient} 
                                        content={prescriptionContent} 
                                        date={new Date().toLocaleDateString()} 
                                    />}
                                    fileName={`receta_${patient.nombre.replace(/\s+/g, '_')}.pdf`}
                                  >
                                    {({ blob, url, loading: pdfLoading, error }) => (
                                      <Button disabled={pdfLoading} className="rounded-full flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        {pdfLoading ? "Generando..." : "Descargar Receta"}
                                      </Button>
                                    )}
                                  </PDFDownloadLink>
                                )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-border/50 rounded-3xl opacity-50">
                              <FileText className="h-16 w-16 mb-4" />
                              <p className="font-bold text-center">No hay recetas generadas hoy.</p>
                              <p className="text-sm text-center">Haz clic en "Nueva Receta" para comenzar.</p>
                          </div>
                        )}
                    </Card>
                )}

                 {activeTab === "finanzas" && (
                    <Card className="border-none bg-transparent shadow-none">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-montserrat">Control de Créditos y Cobranza</h3>
                            <div className="flex gap-2">
                                <Dialog open={isCreditModalOpen} onOpenChange={setIsCreditModalOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="rounded-full flex items-center gap-1 bg-indigo-600 text-white">
                                            <PlusCircle className="h-4 w-4" /> Otorgar Crédito
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-3xl border-border/50">
                                        <DialogHeader>
                                            <DialogTitle>Nuevo Crédito</DialogTitle>
                                            <DialogDescription>Asigna una deuda con interés opcional.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase text-muted-foreground">Monto Base ($)</label>
                                                <input type="number" className="w-full p-3 rounded-xl bg-secondary/20 border border-border/50 outline-none" 
                                                    value={newCredit.monto} onChange={(e) => setNewCredit({...newCredit, monto: parseFloat(e.target.value)})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase text-muted-foreground">Tasa de Interés (%)</label>
                                                <input type="number" className="w-full p-3 rounded-xl bg-secondary/20 border border-border/50 outline-none" 
                                                    value={newCredit.interes} onChange={(e) => setNewCredit({...newCredit, interes: parseFloat(e.target.value)})} placeholder="Ej: 10" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase text-muted-foreground">Notas / Concepto</label>
                                                <input className="w-full p-3 rounded-xl bg-secondary/20 border border-border/50 outline-none" 
                                                    value={newCredit.notas} onChange={(e) => setNewCredit({...newCredit, notas: e.target.value})} placeholder="Ej: Tratamiento Ortodoncia" />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button className="w-full rounded-2xl" onClick={handleCreateCredit} disabled={submitting}>
                                                {submitting ? "Procesando..." : "Confirmar Crédito"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {credits.length === 0 ? (
                                <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-3xl opacity-50">
                                    <CreditCard className="h-16 w-16 mx-auto mb-4" />
                                    <p className="font-bold">Sin actividad financiera</p>
                                    <p className="text-sm">Otorga un crédito para comenzar el seguimiento de cobro.</p>
                                </div>
                            ) : (
                                credits.map((credit) => (
                                    <Card key={credit.id} className="rounded-3xl border-border/40 overflow-hidden shadow-sm">
                                        <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                                                        credit.estado === 'liquidado' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                                    )}>
                                                        {credit.estado}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(credit.created_at), 'dd/MM/yyyy')}</span>
                                                </div>
                                                <h4 className="font-black text-lg">{credit.notas || "Crédito General"}</h4>
                                                <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                                                    <TrendingUp className="h-3 w-3" /> Interés aplicado: {credit.tasa_interes}%
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-8 w-full md:w-auto">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Saldo Pendiente</p>
                                                    <p className={cn("text-2xl font-black", credit.saldo_pendiente > 0 ? "text-indigo-600" : "text-emerald-600")}>
                                                        ${credit.saldo_pendiente.toLocaleString()}
                                                    </p>
                                                </div>
                                                {credit.saldo_pendiente > 0 && (
                                                    <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" className="rounded-2xl bg-slate-900" onClick={() => setSelectedCredit(credit)}>
                                                                <DollarSign className="h-4 w-4 mr-1" /> Cobrar
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="rounded-3xl border-border/50">
                                                            <DialogHeader>
                                                                <DialogTitle>Registrar Pago</DialogTitle>
                                                                <DialogDescription>Abona a la deuda de: {credit.notas}</DialogDescription>
                                                            </DialogHeader>
                                                            <div className="space-y-4 py-4">
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-bold uppercase text-muted-foreground">Monto a Cobrar ($)</label>
                                                                    <input type="number" className="w-full p-3 rounded-xl bg-secondary/20 border border-border/50 outline-none text-xl font-bold" 
                                                                        max={credit.saldo_pendiente}
                                                                        value={newPayment.monto} onChange={(e) => setNewPayment({...newPayment, monto: parseFloat(e.target.value)})} />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4 text-left">
                                                                    <div className="space-y-1 text-left">
                                                                        <label className="text-xs font-bold uppercase text-muted-foreground">Método</label>
                                                                        <select className="w-full p-3 rounded-xl bg-secondary/20 border border-border/50 outline-none"
                                                                            value={newPayment.metodo} onChange={(e) => setNewPayment({...newPayment, metodo: e.target.value})}>
                                                                            <option value="efectivo">Efectivo</option>
                                                                            <option value="tarjeta">Tarjeta</option>
                                                                            <option value="transferencia">Transferencia</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="space-y-1 text-left">
                                                                        <label className="text-xs font-bold uppercase text-muted-foreground">Tipo</label>
                                                                        <select className="w-full p-3 rounded-xl bg-secondary/20 border border-border/50 outline-none"
                                                                            value={newPayment.tipo} onChange={(e) => setNewPayment({...newPayment, tipo: e.target.value})}>
                                                                            <option value="abono">Abono Parcial</option>
                                                                            <option value="liquidacion">Liquidación Total</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500" onClick={handleRegisterPayment} disabled={submitting}>
                                                                    {submitting ? "Procesando..." : "Registrar Dinero Recibido"}
                                                                </Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-secondary/5 border-t border-border/30 p-4">
                                             <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 flex items-center gap-1">
                                                 <Receipt className="h-3 w-3" /> Info de Origen: Monto ${credit.monto_inicial.toLocaleString()} + Intereses
                                             </p>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </Card>
                )}

                {activeTab === "presupuestos" && (
                    <Card className="border-none bg-transparent shadow-none">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-montserrat">Presupuestos e Insumos</h3>
                            <div className="flex gap-2">
                               {budgetItems.length > 0 && clinicData && (
                                  <PDFDownloadLink 
                                    document={<BudgetPdf 
                                        clinic={clinicData} 
                                        patient={patient} 
                                        items={budgetItems} 
                                        id={Math.random().toString(36).substr(2, 6).toUpperCase()} 
                                    />}
                                    fileName={`presupuesto_${patient.nombre.replace(/\s+/g, '_')}.pdf`}
                                  >
                                    {({ loading: pdfLoading }) => (
                                      <Button variant="outline" disabled={pdfLoading} className="rounded-full flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        {pdfLoading ? "Generando..." : "Descargar"}
                                      </Button>
                                    )}
                                  </PDFDownloadLink>
                               )}
                               <Button 
                                 onClick={() => {
                                    setBudgetItems([]);
                                    setNewService({ description: "", price: 0, quantity: 1 });
                                 }}
                                 variant="outline" 
                                 size="sm" 
                                 className="rounded-full"
                               >
                                  Limpiar
                               </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 space-y-4 bg-secondary/10 p-6 rounded-3xl border border-border/50">
                                <h4 className="font-bold flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Agregar Concepto</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Servicio / Insumo</label>
                                        <input className="w-full p-2 rounded-xl bg-background border border-border/50 outline-none" 
                                            value={newService.description} onChange={(e) => setNewService({...newService, description: e.target.value})} placeholder="Ej: Limpieza dental" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-muted-foreground">Precio</label>
                                            <input type="number" className="w-full p-2 rounded-xl bg-background border border-border/50 outline-none" 
                                                value={newService.price} onChange={(e) => setNewService({...newService, price: parseFloat(e.target.value)})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-muted-foreground">Cant.</label>
                                            <input type="number" className="w-full p-2 rounded-xl bg-background border border-border/50 outline-none" 
                                                value={newService.quantity} onChange={(e) => setNewService({...newService, quantity: parseInt(e.target.value)})} />
                                        </div>
                                    </div>
                                    <Button className="w-full rounded-2xl" onClick={() => {
                                        if (newService.description && newService.price > 0) {
                                            setBudgetItems([...budgetItems, newService]);
                                            setNewService({ description: "", price: 0, quantity: 1 });
                                        }
                                    }}>Agregar</Button>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-4">
                                {budgetItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-border/50 rounded-3xl opacity-50">
                                        <DollarSign className="h-16 w-16 mb-4 text-primary" />
                                        <p className="font-bold">Calculadora de Presupuesto</p>
                                        <p className="text-sm text-center">Agrega servicios para generar el PDF formal.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="border rounded-2xl overflow-hidden divide-y divide-border/50">
                                            {budgetItems.map((item, idx) => (
                                                <div key={idx} className="p-4 flex justify-between items-center bg-secondary/5">
                                                    <div>
                                                        <p className="font-bold">{item.description}</p>
                                                        <p className="text-xs text-muted-foreground">{item.quantity} x ${item.price.toLocaleString()}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-bold text-primary">${(item.price * item.quantity).toLocaleString()}</span>
                                                        <Button variant="ghost" size="sm" onClick={() => setBudgetItems(budgetItems.filter((_, i) => i !== idx))} className="text-red-500 h-8 w-8 p-0">×</Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="p-4 flex justify-between items-center bg-secondary/20">
                                                 <span className="font-bold uppercase text-xs tracking-widest text-muted-foreground">Total Estimado</span>
                                                 <span className="text-2xl font-black text-primary">${budgetItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" /> Este presupuesto se genera como borrador interactivo. Al descargar el PDF, se aplicará el formato formal de la clínica.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
