"use client";

import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Settings, 
  BookOpen, 
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Building2,
  Activity,
  TrendingUp,
  ShoppingCart
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const routes = [
  {
    label: "En Vivo",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-sky-500",
  },
  {
    label: "Agenda Maestra",
    icon: Calendar,
    href: "/dashboard/agenda-maestra",
    color: "text-violet-500",
  },
  {
    label: "Pacientes",
    icon: Users,
    href: "/dashboard/pacientes",
    color: "text-pink-700",
  },
  {
    label: "Doctores",
    icon: Stethoscope,
    href: "/dashboard/doctores",
    color: "text-emerald-600",
  },
  {
    label: "Sedes",
    icon: Building2,
    href: "/dashboard/sedes",
    color: "text-blue-600",
  },
  {
    label: "Blog",
    icon: BookOpen,
    href: "/dashboard/blog",
    color: "text-orange-700",
  },
  {
    label: "Finanzas",
    icon: TrendingUp,
    href: "/dashboard/finanzas",
    color: "text-emerald-500",
  },
  {
    label: "Caja (Cobros)",
    icon: ShoppingCart,
    href: "/dashboard/caja",
    color: "text-orange-500",
  },
  {
    label: "Configuración",
    icon: Settings,
    href: "/dashboard/configuracion",
  },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "relative flex flex-col h-full bg-secondary/5 border-r border-border/50 transition-all",
      isCollapsed ? "w-20" : "w-64",
      className
    )}>
      <div className="px-3 py-4 flex-1">
        <div className="flex items-center justify-between mb-8 px-3">
           {!isCollapsed && (
             <div className="flex items-center gap-2 group">
                <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Activity className="h-5 w-5 text-primary animate-heartbeat" />
                </div>
                <span className="font-bold text-lg font-montserrat tracking-tight bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                  NeoMed Pro
                </span>
             </div>
           )}
           <button 
             onClick={() => setIsCollapsed(!isCollapsed)}
             className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary/50"
           >
             {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
           </button>
        </div>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition-all",
                pathname === route.href ? "text-primary bg-primary/10" : "text-muted-foreground",
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {!isCollapsed && <span>{route.label}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
