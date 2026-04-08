import { Activity } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        <div className="relative h-20 w-20 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl">
          <Activity className="h-10 w-10 text-primary animate-heartbeat" />
        </div>
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-black font-montserrat tracking-tighter bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent animate-logo-shimmer">
          NeoMed Pro
        </h2>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">
          Sincronizando sistemas...
        </p>
      </div>
    </div>
  );
}
