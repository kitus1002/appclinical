"use client";

import { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Search, 
  User, 
  Phone, 
  Mail, 
  ChevronRight,
  Filter,
  Edit2,
  Trash2,
  History,
  FileText,
  Stethoscope,
  Activity,
  ArrowLeft,
  Save,
  Trash,
  AlertCircle,
  PlusCircle,
  Printer,
  Download,
  CreditCard,
  ChevronDown,
  Info,
  Scale,
  Ruler,
  Dna,
  DollarSign
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// PDF Generation
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// --- PDF Layouts (COFEPRIS COMPLIANT) ---
const pdfStyles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
  
  // Banner Header
  headerBanner: { 
    flexDirection: 'row', 
    backgroundColor: '#1e1b4b', // Deep Indigo
    margin: -40, 
    marginBottom: 30, 
    padding: 30, 
    paddingBottom: 25,
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  logo: { width: 70, height: 70, borderRadius: 12 },
  clinicNameWhite: { fontSize: 22, fontWeight: 'black', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 },
  clinicInfoWhite: { color: '#e2e8f0', fontSize: 8, marginTop: 2 },
  
  header: { borderBottom: 2, borderColor: '#1e1b4b', paddingBottom: 15, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  clinicName: { fontSize: 20, fontWeight: 'black', color: '#1e1b4b', textTransform: 'uppercase' },
  clinicInfo: { color: '#64748b', fontSize: 10, marginTop: 2 },
  text: { fontSize: 10, color: '#1e293b', lineHeight: 1.5 },
  tableCol: { fontSize: 10, color: '#1e293b' },
  legalNote: { fontSize: 8, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', marginTop: 10 },
  
  docBox: { marginBottom: 25, padding: 15, backgroundColor: '#f8fafc', borderRadius: 12, borderLeft: 4, borderLeftColor: '#4f46e5' },
  docName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  docSubtitle: { fontSize: 10, color: '#4d7c0f', marginTop: 3, fontWeight: 'bold' }, // Especialidad en verde médico
  docDetail: { fontSize: 9, color: '#64748b', marginTop: 1 },
  
  patientBox: { 
    flexDirection: 'row', 
    gap: 15, 
    marginBottom: 25, 
    padding: 12, 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#f1f5f9', 
    borderRadius: 8 
  },
  patientLabel: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2, fontWeight: 'black' },
  patientValue: { fontSize: 9, color: '#1e293b', fontWeight: 'bold' },

  recipeBody: { marginTop: 10 },
  sectionTitle: { 
    fontSize: 10, 
    fontWeight: 'black', 
    color: '#4f46e5', 
    marginBottom: 8, 
    textTransform: 'uppercase', 
    letterSpacing: 1.5,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4
  },
  
  // Table Styles
  table: { marginTop: 5 },
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#f1f5f9', 
    padding: 8, 
    borderRadius: 6,
    marginBottom: 5
  },
  tableHeaderText: { fontSize: 8, fontWeight: 'black', color: '#475569', textTransform: 'uppercase' },
  tableRow: { 
    flexDirection: 'row', 
    padding: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f8fafc',
    alignItems: 'center'
  },
  colMed: { flex: 3 },
  colSpecs: { flex: 4 },
  
  medTitle: { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
  medSub: { fontSize: 8, color: '#64748b', marginTop: 1 },
  medSpec: { fontSize: 9, color: '#334155' },
  
  indications: { 
    marginTop: 30, 
    padding: 15, 
    backgroundColor: '#f5f3ff', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#ddd6fe' 
  },
  indicationsText: { fontSize: 10, color: '#4c1d95', lineHeight: 1.5 },
  
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40 },
  signatureSection: { alignItems: 'center', marginBottom: 20 },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#1e293b', width: 200, marginTop: 40, paddingTop: 8, alignItems: 'center' },
  signatureText: { fontSize: 10, color: '#1e293b', fontWeight: 'bold' },
  
  legalFooter: { textAlign: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
  legalText: { fontSize: 7, color: '#94a3b8', lineHeight: 1.4 }
});


const RecipePDFLine = ({ label, value }: any) => (
    <View style={{ flex: 1 }}>
        <Text style={pdfStyles.patientLabel}>{label}</Text>
        <Text style={pdfStyles.patientValue}>{value || "N/A"}</Text>
    </View>
);

const EMPTY_MED = { nombre_generico: "", forma_farmaceutica: "", dosis: "", presentacion: "", frecuencia: "", via: "", duracion: "", indicaciones: "" };
const RecipePDF = ({ recipe, doctor, clinic, patient }: any) => {
  const age = patient?.fecha_nacimiento ? differenceInYears(new Date(), new Date(patient.fecha_nacimiento)) : "N/A";
  
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* PREMIUM BANNER HEADER */}
        <View style={pdfStyles.headerBanner}>
          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.clinicNameWhite}>{clinic?.nombre || "AppClínica Premium"}</Text>
            <Text style={pdfStyles.clinicInfoWhite}>{clinic?.direccion_fisica || "Sede No Registrada"}</Text>
            <Text style={pdfStyles.clinicInfoWhite}>T. {clinic?.telefono_contacto || "N/A"} | {clinic?.email_contacto || "info@clinic.com"}</Text>
          </View>
          {clinic?.logo_url ? (
            <Image src={clinic.logo_url} style={pdfStyles.logo} />
          ) : (
            <View style={[pdfStyles.logo, { backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' }]}>
               <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'black' }}>+</Text>
            </View>
          )}
        </View>

        {/* DOCTOR INFO (COMPLIANT) */}
        <View style={pdfStyles.docBox}>
          <Text style={pdfStyles.docName}>{doctor?.nombre || "Dr. Especialista"}</Text>
          <Text style={pdfStyles.docSubtitle}>{doctor?.especialidad || "Médico Cirujano"}</Text>
          <View style={{ marginTop: 8 }}>
            <Text style={pdfStyles.docDetail}>Cédula Profesional: {doctor?.cedula || "En Trámite"}</Text>
            <Text style={pdfStyles.docDetail}>Institución: {doctor?.universidad || doctor?.institucion_titulo || "Universidad Nacional"}</Text>
            <Text style={pdfStyles.docDetail}>Expedido por la Dirección General de Profesiones</Text>
          </View>
        </View>

        {/* PATIENT INFO GRID */}
        <View style={pdfStyles.patientBox}>
           <RecipePDFLine label="Paciente" value={patient?.nombre} />
           <RecipePDFLine label="Edad" value={`${age} años`} />
           <RecipePDFLine label="Sexo" value={patient?.genero || patient?.sexo_biologico} />
           <RecipePDFLine label="Fecha" value={format(new Date(), 'dd/MM/yyyy')} />
        </View>

        {/* PRESCRIPTION TABLE */}
        <View style={pdfStyles.recipeBody}>
           <Text style={pdfStyles.sectionTitle}>Prescripción Médica (Rx)</Text>
           
           <View style={pdfStyles.table}>
             {/* Header */}
             <View style={pdfStyles.tableHeader}>
                <View style={pdfStyles.colMed}><Text style={pdfStyles.tableHeaderText}>Medicamento / Presentación</Text></View>
                <View style={pdfStyles.colSpecs}><Text style={pdfStyles.tableHeaderText}>Indicaciones (Dosis, Vía, Frec., Dur.)</Text></View>
             </View>

             {/* Rows */}
             {(recipe.medicamentos || []).map((med: any, i: number) => (
               <View key={i} style={pdfStyles.tableRow}>
                 <View style={pdfStyles.colMed}>
                    <Text style={pdfStyles.medTitle}>{med.nombre_generico || med.nombre}</Text>
                    <Text style={pdfStyles.medSub}>{med.forma_farmaceutica} - {med.presentacion}</Text>
                 </View>
                 <View style={pdfStyles.colSpecs}>
                    <Text style={pdfStyles.medSpec}>
                      {med.dosis} por vía {med.via}, cada {med.frecuencia} durante {med.duracion}.
                    </Text>
                    {med.indicaciones ? (
                      <Text style={[pdfStyles.medSub, { color: '#4f46e5', fontWeight: 'bold' }]}>
                        Obs: {med.indicaciones}
                      </Text>
                    ) : null}
                 </View>
               </View>
             ))}
           </View>

           {recipe.indicaciones_generales ? (
             <View style={pdfStyles.indications}>
               <Text style={pdfStyles.patientLabel}>Indicaciones Generales y Cuidados</Text>
               <Text style={pdfStyles.indicationsText}>{recipe.indicaciones_generales}</Text>
             </View>
           ) : null}
        </View>

        {/* ALERGIAS (CRITICAL) */}
        {patient?.alergias && (
             <View style={{ marginTop: 15, padding: 10, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fee2e2' }}>
                <Text style={[pdfStyles.patientLabel, { color: '#dc2626' }]}>ALERGIAS DETECTADAS (CRÍTICO)</Text>
                <Text style={{ fontSize: 9, color: '#991b1b', fontWeight: 'bold' }}>{patient.alergias}</Text>
             </View>
        )}

        {/* FOOTER & COFEPRIS LEGAL */}
        <View style={pdfStyles.footer}>
           <View style={pdfStyles.signatureSection}>
              <View style={pdfStyles.signatureLine}>
                 <Text style={pdfStyles.signatureText}>{doctor?.nombre}</Text>
                 <Text style={[pdfStyles.docDetail, { fontSize: 8 }]}>Firma del Médico</Text>
              </View>
           </View>

           <View style={pdfStyles.legalFooter}>
              <Text style={pdfStyles.legalText}>
                Esta receta médica cumple con los lineamientos del Reglamento de la Ley General de Salud en Materia de Prestación de Servicios de Atención Médica. 
                Válida por el periodo indicado en el tratamiento. No se automedique. En caso de reacción adversa, suspenda y consulte a su médico.
              </Text>
              <Text style={[pdfStyles.legalText, { marginTop: 4, fontWeight: 'bold' }]}>
                {clinic?.nombre} | {clinic?.direccion_fisica} | Tel: {clinic?.telefono_contacto}
              </Text>
           </View>
        </View>
      </Page>
    </Document>
  );
};

const BudgetPDF = ({ budget, patient, clinic }: any) => (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View>
            <Text style={pdfStyles.clinicName}>{clinic?.nombre || "AppClínica"}</Text>
            <Text style={pdfStyles.clinicInfo}>Cotización de Servicios Médicos</Text>
          </View>
          <Text style={pdfStyles.docSubtitle}>{format(new Date(), 'dd/MM/yyyy')}</Text>
        </View>
  
        <View style={{ marginBottom: 20 }}>
           <Text style={pdfStyles.text}>Paciente: {patient?.nombre}</Text>
        </View>

        <View style={pdfStyles.table}>
            <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
                <Text style={[pdfStyles.tableCol, { flex: 3 }]}>Concepto</Text>
                <Text style={pdfStyles.tableCol}>Costo Unitario</Text>
            </View>
            {budget.items.map((item: any, i: number) => (
                <View key={i} style={pdfStyles.tableRow}>
                    <Text style={[pdfStyles.tableCol, { flex: 3 }]}>{item.concepto}</Text>
                    <Text style={pdfStyles.tableCol}>${item.costo}</Text>
                </View>
            ))}
            <View style={[pdfStyles.tableRow, { borderTop: 2, borderColor: '#1E293B', backgroundColor: '#F8FAFC' }]}>
                <Text style={[pdfStyles.tableCol, { flex: 3, fontWeight: 'bold', fontSize: 14 }]}>TOTAL ESTIMADO</Text>
                <Text style={[pdfStyles.tableCol, { fontWeight: 'bold', fontSize: 14 }]}>${budget.total}</Text>
            </View>
        </View>

        <View style={{ marginTop: 40 }}>
           <Text style={pdfStyles.patientLabel}>Notas Adicionales</Text>
           <Text style={pdfStyles.text}>{budget.notas || "Válido por 15 días naturales a partir de la fecha de emisión."}</Text>
        </View>

        <View style={pdfStyles.footer}>
           <Text style={pdfStyles.legalNote}>Este presupuesto es de carácter informativo y puede variar según la evolución clínica del paciente.</Text>
        </View>
      </Page>
    </Document>
);

// --- Main Component ---
export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [clinicData, setClinicData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Modals / Sheets
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);

  // Forms
  const [formData, setFormData] = useState({
    id: "", nombre: "", telefono: "", email: "", fecha_nacimiento: "", genero: "otro",
    direccion_completa: "", alergias: "", antecedentes_patologicos: "",
    tipo_sangre: "", contacto_emergencia_nombre: "", contacto_emergencia_telefono: "",
    peso_kg: 0, talla_cm: 0, sexo_biologico: "masculino", saldo_inicial: 0, limite_credito: 0
  });

  const [historyForm, setHistoryForm] = useState({ diagnostico: "", tratamiento: "", notas_internas: "" });
  
  const [recipeForm, setRecipeForm] = useState<{ medicamentos: typeof EMPTY_MED[], indicaciones_generales: string }>({
    medicamentos: [{ ...EMPTY_MED }],
    indicaciones_generales: ""
  });
  
  const [budgetForm, setBudgetForm] = useState({ items: [{ concepto: "", costo: 0 }], total: 0, validez_dias: 15, notas: "" });

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: p, error: pError } = await supabase.from('pacientes')
      .select('*')
      .or(`doctor_id.eq.${user?.id},doctor_id.is.null`)
      .order('nombre', { ascending: true });
      
    if (pError) console.error("Error cargando pacientes:", pError);

    const { data: d } = await supabase.from('doctores').select('*');
    const { data: c } = await supabase.from('consultorios').select('*').limit(1).single();

    if (p) {
        // Fetch all credits for these patients in a second query to avoid Join errors
        const pIds = p.map(pt => pt.id);
        const { data: allCredits } = await supabase.from('creditos')
            .select('paciente_id, saldo_pendiente')
            .in('paciente_id', pIds)
            .eq('estado', 'vigente');

        const processed = p.map(patient => ({
            ...patient,
            total_deuda: (allCredits || [])
                .filter(cr => cr.paciente_id === patient.id)
                .reduce((acc: number, curr: any) => acc + Number(curr.saldo_pendiente), 0)
        }));
        setPatients(processed);
    }
    if (d) {
        setDoctors(d);
        if (d.length > 0) setSelectedDoctorId(d[0].id);
    }
    if (c) setClinicData(c);
    setLoading(false);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { id, saldo_inicial, total_deuda, creditos, ...cleanData } = formData as any;
    
    // Ensure limite_credito is treated as a number
    cleanData.limite_credito = Number(cleanData.limite_credito || 0);
    
    // Auto-calculate IMC for the database
    if (cleanData.peso_kg > 0 && cleanData.talla_cm > 0) {
        const heightMeters = cleanData.talla_cm / 100;
        cleanData.imc = cleanData.peso_kg / (heightMeters * heightMeters);
    }

    const { data: newPat, error } = id 
        ? await supabase.from('pacientes').update({ ...cleanData, doctor_id: user.id }).eq('id', id).select().single()
        : await supabase.from('pacientes').insert([{ 
            ...cleanData, 
            doctor_id: user.id,
            consultorio_id: clinicData?.id 
          }]).select().single();

    if (error) {
        alert("Error al guardar: " + error.message);
    } else if (saldo_inicial > 0) {
        // Create credit regardless if it's new or existing patient
        await supabase.from('creditos').insert({
            paciente_id: newPat.id,
            doctor_id: user.id,
            monto_inicial: saldo_inicial,
            tasa_interes: 0,
            total_con_interes: saldo_inicial,
            saldo_pendiente: saldo_inicial,
            notas: id ? "Crédito añadido desde edición de perfil" : "Saldo inicial al registro de paciente",
            estado: 'vigente'
        });
    }

    if (!error) { setIsModalOpen(false); fetchInitialData(); }
    setSaving(false);
  };

  const handleDeletePatient = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este paciente? Se borrará todo su historial permanentemente.")) return;
    const { error } = await supabase.from('pacientes').delete().eq('id', id);
    if (error) alert(error.message); else fetchInitialData();
  };

  const handleAssignToMe = async (patientId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('pacientes').update({ doctor_id: user.id }).eq('id', patientId);
    if (error) alert(error.message); else fetchInitialData();
  };

  const fetchHistory = async (patientId: string) => {
    setHistoryLoading(true);
    const { data } = await supabase.from('historial_clinico').select('*, doctores(nombre)').eq('paciente_id', patientId).order('fecha', { ascending: false });
    if (data) setPatientHistory(data);
    setHistoryLoading(false);
  };

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctorId) return;
    setSaving(true);
    const { error } = await supabase.from('historial_clinico').insert({
        paciente_id: selectedPatient.id,
        doctor_id: selectedDoctorId,
        ...historyForm
    });
    if (error) alert(error.message); else { setHistoryForm({ diagnostico: "", tratamiento: "", notas_internas: "" }); fetchHistory(selectedPatient.id); }
    setSaving(false);
  };

  const updateMed = (idx: number, field: string, value: string) => {
    const updated = recipeForm.medicamentos.map((m, i) => i === idx ? { ...m, [field]: value } : m);
    setRecipeForm({ ...recipeForm, medicamentos: updated });
  };

  const addMed = () => setRecipeForm({ ...recipeForm, medicamentos: [...recipeForm.medicamentos, { ...EMPTY_MED }] });

  const removeMed = (idx: number) => {
    if (recipeForm.medicamentos.length === 1) return;
    setRecipeForm({ ...recipeForm, medicamentos: recipeForm.medicamentos.filter((_, i) => i !== idx) });
  };

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctorId) return;
    setSaving(true);
    const { error } = await supabase.from('recetas').insert({
      paciente_id: selectedPatient.id,
      doctor_id: selectedDoctorId,
      medicamentos: recipeForm.medicamentos,
      indicaciones_generales: recipeForm.indicaciones_generales,
    });
    if (error) alert("Error al guardar receta: " + error.message);
    else {
      setRecipeForm({ medicamentos: [{ ...EMPTY_MED }], indicaciones_generales: "" });
      setIsRecipeOpen(false);
    }
    setSaving(false);
  };

  const calculateBudgetTotal = (items: any[]) => items.reduce((acc, curr) => acc + Number(curr.costo), 0);

  const filteredPatients = patients.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 lg:p-12 font-montserrat flex flex-col items-center">
      <div className="max-w-7xl w-full space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-8 bg-slate-900/40 p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
           <div className="space-y-2 relative z-10">
              <h1 className="text-4xl font-black tracking-tight text-white uppercase">Gestión Clínica <span className="text-blue-500 font-bold ml-2">PRO</span></h1>
              <p className="text-slate-500 font-medium tracking-wide">Base de datos centralizada con cumplimiento normativo y expedientes detallados.</p>
           </div>
           <Button onClick={() => { setFormData({ id: "", nombre: "", telefono: "", email: "", fecha_nacimiento: "", genero: "otro", direccion_completa: "", alergias: "", antecedentes_patologicos: "", tipo_sangre: "", contacto_emergencia_nombre: "", contacto_emergencia_telefono: "", peso_kg: 0, talla_cm: 0, sexo_biologico: "masculino", saldo_inicial: 0, limite_credito: 0 }); setIsModalOpen(true); }} className="bg-white text-slate-950 px-10 py-8 rounded-[2rem] font-black text-lg shadow-2xl transition-all hover:scale-105 active:scale-95 group">
              <PlusCircle className="h-6 w-6 mr-3 group-hover:rotate-90 transition-all" /> Nuevo Registro
           </Button>
        </header>

        {/* Search */}
        <div className="relative group max-w-2xl w-full">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-all" />
           <input className="w-full pl-16 pr-8 py-6 bg-slate-900 border-2 border-slate-800 rounded-[2rem] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-lg text-white" placeholder="Localizar expediente por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {filteredPatients.map(p => (
              <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -5 }}>
                 <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800 rounded-[3rem] p-8 space-y-6 hover:border-blue-500/50 transition-all group overflow-hidden relative">
                    <div className="flex justify-between items-start">
                       <div className="h-16 w-16 rounded-3xl bg-blue-500 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-500/20">{p.nombre[0]}</div>
                       <div className="flex flex-col items-end">
                          <div className="flex gap-1 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
                             <Button variant="ghost" size="icon" onClick={() => { setFormData({...p}); setIsModalOpen(true); }} className="h-10 w-10 text-slate-500 hover:text-blue-400 transition-colors"><Edit2 className="h-4 w-4" /></Button>
                             <Button variant="ghost" size="icon" onClick={() => handleDeletePatient(p.id)} className="h-10 w-10 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                          <div className="flex flex-col items-end gap-1 mt-2">
                             {p.limite_credito > 0 && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-2">
                                   <Activity className="h-3 w-3 text-emerald-500" />
                                   <span className="text-[10px] font-black text-emerald-500 uppercase">Límite: ${Number(p.limite_credito).toLocaleString()}</span>
                                </div>
                             )}
                             {p.total_deuda > 0 && (
                                <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-2">
                                   <DollarSign className="h-3 w-3 text-rose-500" />
                                   <span className="text-[10px] font-black text-rose-500 uppercase">Deuda: ${p.total_deuda.toLocaleString()}</span>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-2">{p.nombre}</h3>
                       <div className="flex flex-wrap gap-2">
                           <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">{p.id.slice(0,8)}</span>
                           {!p.doctor_id ? (
                               <Button size="sm" onClick={() => handleAssignToMe(p.id)} className="h-6 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full hover:bg-amber-600">
                                   Asignarme
                               </Button>
                           ) : (
                               <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">Activo</span>
                           )}
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <Button onClick={() => { setSelectedPatient(p); fetchHistory(p.id); setIsHistoryOpen(true); }} className="bg-slate-950 border border-slate-800 rounded-2xl py-8 font-black text-[10px] tracking-widest gap-2 uppercase overflow-hidden hover:bg-slate-800"><History className="h-5 w-5" /> Expediente</Button>
                       <Button onClick={() => { setSelectedPatient(p); setIsRecipeOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-8 font-black text-[10px] tracking-widest gap-2 uppercase shadow-xl shadow-blue-600/10"><FileText className="h-5 w-5" /> Receta</Button>
                       <Button onClick={() => { setSelectedPatient(p); setIsBudgetOpen(true); }} className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-2xl py-8 font-black text-[10px] tracking-widest gap-2 uppercase col-span-2 group/btn">
                          <CreditCard className="h-5 w-5 group-hover/btn:rotate-12 transition-transform" /> Presupuesto Médico PDF
                       </Button>
                    </div>
                 </Card>
              </motion.div>
           ))}
        </div>
      </div>

      {/* RE-DISEÑO: History Sheet (DETAILED HISTORY TIMELINE) */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
         <SheetContent className="bg-[#020617] border-l border-slate-800 sm:max-w-xl p-0 flex flex-col">
            <SheetHeader className="p-12 pb-6 bg-slate-900/60 border-b border-slate-800 backdrop-blur-3xl sticky top-0 z-50">
               <div className="flex items-center justify-between mb-6">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">H</div>
                  <DigitalClock />
               </div>
               <SheetTitle className="text-4xl font-black text-white uppercase tracking-tight">Expediente Clínico</SheetTitle>
               <SheetDescription className="flex items-center gap-2 mt-2">
                   <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-[0.2em]">{selectedPatient?.nombre}</span>
               </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-16">
               {/* Patient Stats Widget */}
               <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "PESO", val: `${selectedPatient?.peso_kg || '--'} kg`, icon: Scale },
                    { label: "TALLA", val: `${selectedPatient?.talla_cm || '--'} cm`, icon: Ruler },
                    { label: "IMC", val: selectedPatient?.imc?.toFixed(1) || '--', icon: Activity }
                  ].map((s, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex flex-col items-center gap-1 shadow-inner">
                       <s.icon className="h-4 w-4 text-slate-500 mb-1" />
                       <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{s.label}</span>
                       <span className="text-lg font-black text-white">{s.val}</span>
                    </div>
                  ))}
               </div>

               {/* New Note Form */}
               <form onSubmit={handleAddHistory} className="space-y-6 bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800 shadow-2xl">
                  <h3 className="text-[10px] font-black uppercase text-blue-500 tracking-widest flex items-center gap-3">
                     <PlusCircle className="h-5 w-5" /> Nueva Evolución Clínica
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="relative">
                        <select className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl p-5 font-black text-xs text-white appearance-none focus:border-blue-500 transition-all" value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)}>
                            {doctors.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    </div>

                    <textarea required className="w-full p-6 bg-slate-950 border-2 border-slate-800 rounded-[2rem] text-sm font-bold text-white focus:border-blue-500 outline-none h-28 resize-none shadow-inner" placeholder="Escribe el Diagnóstico actual..." value={historyForm.diagnostico} onChange={(e) => setHistoryForm({...historyForm, diagnostico: e.target.value})} />
                    <textarea required className="w-full p-6 bg-slate-950 border-2 border-slate-800 rounded-[2rem] text-sm font-bold text-blue-200/80 focus:border-indigo-500 outline-none h-28 resize-none shadow-inner" placeholder="Plan de Tratamiento / Notas médicas..." value={historyForm.tratamiento} onChange={(e) => setHistoryForm({...historyForm, tratamiento: e.target.value})} />
                    
                    <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all text-white font-black uppercase text-[10px] py-8 rounded-full shadow-xl shadow-blue-600/10">Registrar en Expediente</Button>
                  </div>
               </form>

               {/* Detailed History Timeline */}
               <div className="space-y-12">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-3">
                      <History className="h-5 w-5" /> Trayectoria Clínica Histórica
                  </h3>
                  <div className="space-y-10 relative before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-800">
                     {patientHistory.map((h, i) => (
                        <div key={h.id} className="relative pl-12 group">
                           <div className="absolute left-0 top-2 h-6 w-6 rounded-full bg-slate-950 border-4 border-slate-800 group-hover:border-blue-500 transition-all z-10" />
                           <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] transition-all hover:bg-slate-900 hover:border-slate-700 shadow-lg">
                              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                                 <div className="flex items-center gap-2">
                                     <Stethoscope className="h-4 w-4 text-blue-500" />
                                     <span className="text-[10px] font-black text-white uppercase tracking-widest">DR. {h.doctores?.nombre}</span>
                                 </div>
                                 <span className="text-[10px] font-black text-slate-600">{format(new Date(h.fecha), "PPP", { locale: es })}</span>
                              </div>
                              <div className="space-y-6">
                                 <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Diagnóstico Resultante</p>
                                    <p className="text-lg font-bold text-white tracking-tight leading-tight uppercase italic font-montserrat">"{h.diagnostico}"</p>
                                 </div>
                                 <div className="bg-slate-950/80 p-6 rounded-2xl border border-white/5 space-y-2">
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Tratamiento Aplicado</p>
                                    <p className="text-sm font-medium text-slate-300 leading-relaxed font-inter">{h.tratamiento}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </SheetContent>
      </Sheet>

      {/* RE-DISEÑO: RECETA COMPLIANT (Mexican COFEPRIS) */}
      <Dialog open={isRecipeOpen} onOpenChange={setIsRecipeOpen}>
         <DialogContent className="bg-[#020617] border border-slate-800 sm:max-w-3xl rounded-[4rem] p-16 overflow-y-auto max-h-[90vh]">
            <DialogHeader className="space-y-6 border-b border-white/5 pb-8">
               <div className="flex items-center gap-5">
                  <div className="h-20 w-20 rounded-[2rem] bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/30">
                     <FileText className="h-10 w-10" />
                  </div>
                  <div>
                    <DialogTitle className="text-5xl font-black text-white uppercase tracking-tighter leading-none">Nueva Receta</DialogTitle>
                    <DialogDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 flex items-center gap-2">
                       <Info className="h-3 w-3" /> CUMPLIMIENTO COFEPRIS / NORMATIVA MX
                    </DialogDescription>
                  </div>
               </div>
            </DialogHeader>

            <form onSubmit={handleAddRecipe} className="space-y-10 py-10">
               {/* Medication Cards */}
               <div className="space-y-6">
                  {recipeForm.medicamentos.map((med, idx) => (
                    <div key={idx} className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-inner space-y-6 relative">
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="h-9 w-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/20">{idx + 1}</span>
                          <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Medicamento #{idx + 1}</h3>
                        </div>
                        {recipeForm.medicamentos.length > 1 && (
                          <Button type="button" variant="ghost" onClick={() => removeMed(idx)} className="h-9 w-9 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all p-0 flex items-center justify-center">
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Fields Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <RecipeFormField label="Nombre Genérico *" value={med.nombre_generico} onChange={(v: string) => updateMed(idx, 'nombre_generico', v)} placeholder="Ej: Paracetamol" />
                        <RecipeFormField label="Forma Farmacéutica *" value={med.forma_farmaceutica} onChange={(v: string) => updateMed(idx, 'forma_farmaceutica', v)} placeholder="Ej: Tabletas / Suspensión" />
                        <RecipeFormField label="Presentación *" value={med.presentacion} onChange={(v: string) => updateMed(idx, 'presentacion', v)} placeholder="Ej: 500 mg, Caja con 20" />
                        <RecipeFormField label="Dosis *" value={med.dosis} onChange={(v: string) => updateMed(idx, 'dosis', v)} placeholder="Ej: 1 tableta" />
                        <RecipeFormField label="Vía de Administración *" value={med.via} onChange={(v: string) => updateMed(idx, 'via', v)} placeholder="Ej: Oral / Intramuscular" />
                        <RecipeFormField label="Frecuencia *" value={med.frecuencia} onChange={(v: string) => updateMed(idx, 'frecuencia', v)} placeholder="Ej: Cada 8 horas" />
                        <div className="md:col-span-2">
                          <RecipeFormField label="Duración *" value={med.duracion} onChange={(v: string) => updateMed(idx, 'duracion', v)} placeholder="Ej: 7 días" />
                        </div>
                      </div>

                      {/* Per-med Indicaciones */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Indicaciones Específicas</label>
                        <textarea
                          className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl p-5 text-sm font-bold text-white h-24 focus:border-blue-500 transition-all outline-none shadow-inner resize-none"
                          placeholder="Tomar con alimentos, suspender ante reacción adversa..."
                          value={med.indicaciones}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateMed(idx, 'indicaciones', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
               </div>

               {/* Add medication button */}
               <Button
                 type="button"
                 onClick={addMed}
                 className="w-full border-2 border-dashed border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 rounded-[2rem] py-8 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:border-blue-500/60"
               >
                 <PlusCircle className="h-5 w-5" /> Añadir Otro Medicamento
               </Button>

               {/* Global Indications */}
               <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Indicaciones Generales del Tratamiento</label>
                 <textarea
                   className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl p-6 text-sm font-bold text-white h-28 focus:border-indigo-500 transition-all outline-none shadow-inner resize-none"
                   placeholder="Notas generales del tratamiento: reposo, dieta, signos de alarma..."
                   value={recipeForm.indicaciones_generales}
                   onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRecipeForm({ ...recipeForm, indicaciones_generales: e.target.value })}
                 />
               </div>

               {/* Action Buttons */}
               <div className="flex flex-col md:flex-row gap-6">
                  <Button type="submit" disabled={saving} className="flex-1 bg-slate-900 border border-slate-800 py-10 rounded-full font-black uppercase text-xs tracking-widest text-slate-400 hover:text-white transition-all">Solo Registro Digital</Button>
                  <PDFDownloadLink
                    document={<RecipePDF recipe={recipeForm} doctor={doctors.find(d => d.id === selectedDoctorId)} clinic={clinicData} patient={selectedPatient} />}
                    fileName={`Receta_${selectedPatient?.nombre}_${format(new Date(), 'dd-MM')}.pdf`}
                    className="flex-[1.5] bg-white text-slate-950 py-10 rounded-full font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl"
                  >
                        <Printer className="h-6 w-6" /> EMITIR RECETA PDF (COFEPRIS)
                  </PDFDownloadLink>
               </div>
            </form>
         </DialogContent>
      </Dialog>

      {/* Budget Modal */}
      <Dialog open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
         <DialogContent className="bg-[#020617] border border-slate-800 sm:max-w-2xl rounded-[3rem] p-12 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300">
            <DialogHeader className="space-y-4">
               <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20"><CreditCard className="h-8 w-8" /></div>
               <DialogTitle className="text-4xl font-black text-white uppercase tracking-tight">Presupuesto</DialogTitle>
               <DialogDescription className="text-slate-500 font-bold">Genera un desglose de costos para el tratamiento.</DialogDescription>
            </DialogHeader>
            {/* Same as before but with consistent styling */}
            <div className="space-y-8 py-6">
                <div className="space-y-4">
                    {budgetForm.items.map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-end animate-in fade-in slide-in-from-top-1">
                            <div className="flex-1 space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Concepto</label>
                                <input className="w-full bg-slate-800/50 border-2 border-slate-700 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-indigo-500" value={item.concepto} onChange={(e: any) => { const n = [...budgetForm.items]; n[idx].concepto = e.target.value; setBudgetForm({...budgetForm, items: n}); }} />
                            </div>
                            <div className="w-32 space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Costo ($)</label>
                                <input type="number" className="w-full bg-slate-800/50 border-2 border-slate-700 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-indigo-500" value={item.costo} onChange={(e: any) => { const n = [...budgetForm.items]; n[idx].costo = Number(e.target.value); setBudgetForm({...budgetForm, items: n, total: calculateBudgetTotal(n)}); }} />
                            </div>
                            <Button variant="ghost" onClick={() => { const n = budgetForm.items.filter((_, i) => i !== idx); setBudgetForm({...budgetForm, items: n, total: calculateBudgetTotal(n)}); }} className="mb-1 text-rose-500"><Trash className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    <Button variant="ghost" onClick={() => setBudgetForm({...budgetForm, items: [...budgetForm.items, { concepto: "", costo: 0 }]})} className="w-full border-2 border-dashed border-slate-800 py-6 rounded-2xl text-slate-500 hover:text-white flex gap-2"><Plus className="h-4 w-4" /> Añadir Concepto</Button>
                </div>
                
                <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 flex justify-between items-center shadow-inner">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Presupuestado</span>
                    <span className="text-3xl font-black text-white font-mono tracking-tighter">${budgetForm.total}</span>
                </div>

                <PDFDownloadLink
                    document={<BudgetPDF budget={budgetForm} patient={selectedPatient} clinic={clinicData} />}
                    fileName={`Cotizacion_${selectedPatient?.nombre}.pdf`}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-full py-10 font-black uppercase text-xl shadow-2xl flex items-center justify-center gap-4 transition-all"
                >
                    <Download className="h-6 w-6" /> DESCARGAR COTIZACIÓN PDF
                </PDFDownloadLink>
            </div>
         </DialogContent>
      </Dialog>

      {/* Patient Edit (Regulatory Update) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#020617] border border-slate-800 shadow-2xl sm:max-w-4xl rounded-[4rem] p-16 overflow-y-auto max-h-[90vh]">
           <DialogHeader className="space-y-6">
              <DialogTitle className="text-5xl font-black text-white uppercase tracking-tighter">{formData.id ? "Actualizar Perfil" : "Nuevo Registro"}</DialogTitle>
              <DialogDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Complementa datos clínicos normativos</DialogDescription>
           </DialogHeader>

           <form onSubmit={handleSavePatient} className="space-y-12 py-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 <div className="md:col-span-2 lg:col-span-3 space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Nombre Completo *</label>
                    <input required className="w-full bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-6 text-xl font-black outline-none focus:border-blue-500 transition-all text-white shadow-inner" value={formData.nombre} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nombre: e.target.value})} />
                 </div>
                 <RecipeFormField label="WhatsApp" value={formData.telefono} onChange={(v: string) => setFormData({...formData, telefono: v})} />
                 <RecipeFormField label="Email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} />
                 <RecipeFormField label="Nacimiento" value={formData.fecha_nacimiento} onChange={(v: string) => setFormData({...formData, fecha_nacimiento: v})} type="date" />
                 
                 {/* Regulatory Fields */}
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 ml-4">Sexo Biológico</label>
                    <div className="relative">
                        <select className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 font-black text-xs text-white appearance-none" value={formData.sexo_biologico} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, sexo_biologico: e.target.value})}>
                            <option value="masculino">Masculino</option>
                            <option value="femenino">Femenino</option>
                            <option value="otro">Otro</option>
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    </div>
                 </div>
                 <RecipeFormField label="Peso (KG)" value={formData.peso_kg} onChange={(v: string) => setFormData({...formData, peso_kg: Number(v)})} type="number" />
                 <RecipeFormField label="Talla (CM)" value={formData.talla_cm} onChange={(v: string) => setFormData({...formData, talla_cm: Number(v)})} type="number" />
                  
                  <div className="space-y-3 bg-amber-500/10 p-5 rounded-[2rem] border border-amber-500/20">
                        <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 ml-4 flex items-center gap-2">
                           <Activity className="h-4 w-4" /> Límite de Crédito Autorizado
                        </label>
                        <input 
                          type="number"
                          className="w-full bg-slate-900 border-2 border-slate-200 rounded-[2rem] p-6 text-xl font-black text-blue-600 outline-none focus:border-blue-500"
                          placeholder="Monto límite (ej: 3000)..."
                          value={formData.limite_credito}
                          onChange={(e) => setFormData({ ...formData, limite_credito: Number(e.target.value) })}
                        />
                    </div>

                    <div className="space-y-3 bg-amber-500/10 p-5 rounded-[2rem] border border-amber-500/20">
                        <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 ml-4 flex items-center gap-2">
                           <DollarSign className="h-4 w-4" /> Deuda de Arranque (Saldo Inicial)
                        </label>
                      <input 
                        type="number"
                        className="w-full bg-white border-2 border-amber-500/20 rounded-2xl p-4 text-lg font-black outline-none focus:border-amber-500 text-amber-700"
                        placeholder="0.00"
                        value={(formData as any).saldo_inicial}
                        onChange={(e) => setFormData({...formData, saldo_inicial: Number(e.target.value)} as any)}
                      />
                      <p className="text-[9px] text-amber-600/70 font-bold ml-4">
                        {formData.id 
                          ? "Esto creará una nueva deuda vigente adicional para el paciente." 
                          : "Se creará una deuda inicial vigente para este paciente."}
                      </p>
                  </div>
              </div>

              <div className="p-10 bg-slate-950/80 rounded-[3.5rem] border border-slate-800 space-y-8">
                  <h4 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-500"><Dna className="h-4 w-4" /> Alertas Clínicas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 ml-4">Alergias Conocidas</label>
                        <textarea className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 text-sm font-bold h-24 focus:border-rose-500 outline-none transition-all shadow-inner" value={formData.alergias} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, alergias: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Antecedentes Clínicos</label>
                        <textarea className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 text-sm font-bold h-24 focus:border-blue-500 outline-none transition-all shadow-inner" value={formData.antecedentes_patologicos} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, antecedentes_patologicos: e.target.value})} />
                    </div>
                  </div>
              </div>

              <DialogFooter>
                 <Button type="submit" disabled={saving} className="w-full bg-white text-slate-950 rounded-full py-12 font-black text-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl">
                    {saving ? "Procesando..." : (formData.id ? "Actualizar Expediente PRO" : "Confirmar Registro Clínico")}
                 </Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}

function DigitalClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <div className="text-right">
            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">CDMX REGIME</p>
            <p className="text-xl font-black text-white tabular-nums tracking-tighter">{time.toLocaleTimeString('es-MX', { hour12: false })}</p>
        </div>
    );
}

function RecipeFormField({ label, value, onChange, type = "text", placeholder }: { label: string, value: any, onChange: (v: string) => void, type?: string, placeholder?: string }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">{label}</label>
            <input type={type} className="w-full bg-slate-950 border-2 border-slate-800 rounded-[1.5rem] p-5 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner" placeholder={placeholder} value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} />
        </div>
    );
}
