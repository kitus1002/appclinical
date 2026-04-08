import { Sidebar } from "@/components/dashboard/sidebar";
import { UserNav } from "@/components/dashboard/user-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar className="hidden md:flex w-64 flex-col border-r border-border/50" />
      <div className="flex flex-col flex-1 overflow-y-auto">
        <header className="h-20 border-b border-border/40 flex items-center justify-between px-10 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary to-emerald-500 flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse-glow">
                <span className="text-white font-black text-xl italic">N</span>
            </div>
            <h2 className="text-2xl font-black font-montserrat tracking-tighter uppercase italic bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">NeoMed Pro</h2>
          </div>
          <UserNav />
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
