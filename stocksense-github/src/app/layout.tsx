import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "StockSense — Smart Inventory Operating System",
  description: "Next-generation inventory intelligence and real-time ledger management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-900 antialiased overflow-hidden">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
