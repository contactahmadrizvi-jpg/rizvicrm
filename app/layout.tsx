import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { NetworkBanner } from "@/components/NetworkBanner";

export const metadata: Metadata = {
  title: "Rizvi CRM",
  description: "Modern CRM Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50/50 text-slate-900 antialiased">
        <ThemeProvider>
          <AuthProvider>
            <NetworkProvider>
              <NetworkBanner />
              {children}
            </NetworkProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
