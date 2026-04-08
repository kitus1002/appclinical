import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { LoadingOverlay } from "@/components/landing/LoadingOverlay";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });

export const metadata: Metadata = {
  title: "NeoMed Pro | Gestión Inteligente de Consultorios",
  description: "La plataforma definitiva para la gestión clínica moderna, especializada en giros de salud con tecnología de vanguardia.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={cn(
        "min-h-screen font-sans antialiased",
        inter.variable,
        montserrat.variable
      )}>
        <LoadingOverlay />
        {children}
      </body>
    </html>
  );
}

