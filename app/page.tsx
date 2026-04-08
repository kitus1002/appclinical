"use client";

import { Calendar, ShieldCheck, Zap, Users, ArrowRight, Activity, Clock, Globe, Code } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FuturisticBackground } from "@/components/landing/FuturisticBackground";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <div className="flex flex-col min-h-screen selection:bg-primary/30 scroll-smooth">
      <FuturisticBackground />
      
      <header className="px-4 lg:px-6 h-20 flex items-center border-b border-white/5 sticky top-0 bg-background/40 backdrop-blur-xl z-50 transition-all">
        <Link className="flex items-center justify-center gap-2 group" href="#">
          <motion.div 
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
            className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors"
          >
            <Activity className="h-6 w-6 text-primary animate-heartbeat" />
          </motion.div>
          <div className="relative overflow-hidden group">
            <span className="font-bold text-2xl font-montserrat tracking-tighter bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent group-hover:animate-logo-shimmer">
              NeoMed Pro
            </span>
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-white/20 -skew-x-12"
            />
          </div>
        </Link>
        <nav className="ml-auto flex gap-6 sm:gap-8">
          <Link className="text-sm font-semibold hover:text-primary transition-all hover:scale-105" href="#features">
            Características
          </Link>
          <Link className="text-sm font-semibold hover:text-primary transition-all hover:scale-105" href="#about">
            Acerca de
          </Link>
          <Link className="text-sm font-semibold hover:text-primary transition-all hover:scale-105" href="/dashboard">
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="flex-1 relative">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-48 px-4">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="container mx-auto"
          >
            <div className="flex flex-col items-center space-y-8 text-center">
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold animate-float">
                <Activity className="w-4 h-4" />
                <span>Next-Gen Medical Platform</span>
              </motion.div>
              
              <div className="space-y-4 max-w-4xl">
                <motion.h1 
                  variants={itemVariants}
                  className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-montserrat leading-[1.1]"
                >
                  Gestión Inteligente para el <br />
                  <span className="relative inline-block mt-2">
                    <span className="relative z-10 bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                      Consultorio Moderno
                    </span>
                    <span className="absolute bottom-2 left-0 w-full h-3 bg-primary/10 -z-10 rounded-full blur-sm" />
                  </span>
                </motion.h1>
                
                <motion.p 
                  variants={itemVariants}
                  className="mx-auto max-w-[800px] text-muted-foreground md:text-xl lg:text-2xl font-medium leading-relaxed"
                >
                  La evolución de AppClínica ahora es <span className="text-primary font-bold">NeoMed Pro</span>. Optimiza tu agenda y gestiona tu clínica con tecnología de vanguardia.
                </motion.p>
              </div>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/agenda">
                  <button className="group relative bg-primary text-primary-foreground px-10 py-4 rounded-2xl font-bold hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all flex items-center gap-3 overflow-hidden">
                    <span className="relative z-10">Reservar Cita</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform relative z-10" />
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                  </button>
                </Link>
                <Link href="/dashboard">
                  <button className="glass px-10 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all border border-white/20">
                    Acceso Doctor
                  </button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-32 relative">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="grid gap-8 sm:grid-cols-2 md:grid-cols-3"
            >
              {[
                {
                  icon: Calendar,
                  title: "Agenda en Vivo",
                  desc: "Sincronización instantánea entre la vista pública y el dashboard privado.",
                  color: "text-blue-400"
                },
                {
                  icon: ShieldCheck,
                  title: "Historias Clínicas",
                  desc: "Editor enriquecido, recetas automáticas y presupuestos listos para firmar.",
                  color: "text-emerald-400"
                },
                {
                  icon: Users,
                  title: "Multi-Tenancy",
                  desc: "Prepara tu clínica para crecer. Gestión remota desde cualquier dispositivo.",
                  color: "text-purple-400"
                }
              ].map((feature, idx) => (
                <div 
                  key={idx}
                  className="glass-card group flex flex-col items-center space-y-4 p-8 rounded-[2.5rem] hover:scale-[1.02] transition-all hover:bg-white/10 cursor-default"
                >
                  <div className={`p-4 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-colors ${feature.color}`}>
                    <feature.icon className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold font-montserrat">{feature.title}</h3>
                  <p className="text-center text-muted-foreground font-medium leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* About / Credit Section */}
        <section id="about" className="w-full py-24 bg-white/[0.02] border-y border-white/5">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-12 max-w-5xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative shrink-0"
              >
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                <div className="relative p-4 glass rounded-full overflow-hidden border border-white/20">
                  <Image 
                    src="/images/apptuz-logo.png" 
                    alt="Apptuz Digital Logo" 
                    width={200} 
                    height={200} 
                    className="rounded-full"
                  />
                </div>
              </motion.div>
              
              <div className="flex-1 space-y-6 text-center md:text-left">
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold font-montserrat tracking-tight">Acerca de NeoMed Pro</h2>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Esta plataforma ha sido diseñada y desarrollada por <span className="text-primary font-bold">Apptuz Digital</span> específicamente para transformar la gestión en centros de salud y consultorios médicos.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  <div className="glass p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <Code className="text-primary w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Creador</span>
                    </div>
                    <p className="text-2xl font-bold font-montserrat text-white tracking-tight">J Raul Mtz M</p>
                  </div>
                  <div className="glass p-6 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <ShieldCheck className="text-primary w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Sector</span>
                    </div>
                    <p className="text-2xl font-bold font-montserrat text-white tracking-tight">Salud Digital</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full py-20">
          <div className="container mx-auto px-4 text-center">
             <div className="max-w-[700px] mx-auto space-y-4 mb-16">
                <h2 className="text-3xl font-bold font-montserrat">Tecnología en el Corazón de la Salud</h2>
                <p className="text-muted-foreground">Nuestra infraestructura garantiza seguridad, velocidad y disponibilidad constante.</p>
             </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "Tiempo Real", val: "100%", icon: Clock },
                { label: "Sedes", val: "Multi", icon: Globe },
                { label: "Seguridad", val: "Alta", icon: ShieldCheck },
                { label: "Dispositivos", val: "Todos", icon: Activity },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center space-y-2">
                  <stat.icon className="w-6 h-6 text-primary/60" />
                  <span className="text-3xl font-bold font-montserrat">{stat.val}</span>
                  <span className="text-sm text-muted-foreground font-semibold uppercase tracking-widest">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-4 sm:flex-row py-10 w-full shrink-0 items-center px-4 md:px-6 border-t border-white/5 bg-background/50 backdrop-blur-md">
        <p className="text-sm text-muted-foreground font-medium">© 2026 NeoMed Pro. Crafted with passion by Apptuz Digital.</p>
        <nav className="sm:ml-auto flex gap-6">
          <Link className="text-sm font-semibold hover:text-primary transition-colors" href="#">
            Términos
          </Link>
          <Link className="text-sm font-semibold hover:text-primary transition-colors" href="#">
            Privacidad
          </Link>
        </nav>
      </footer>
    </div>
  );
}
