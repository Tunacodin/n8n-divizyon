import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/Sidebar"
import { MainShell } from "@/components/MainShell"
import { SWRProvider } from "@/components/SWRProvider"
import { ThemeProvider } from "@/components/ThemeProvider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Divizyon — Başvuru Yönetim Paneli",
  description: "Divizyon Açık İnovasyon Ağı üye başvuru yönetim sistemi",
}

// Inline FOUC önleme — tema sınıfı render öncesi uygulansın
const themeInitScript = `
(function(){try{
  var s=localStorage.getItem('divizyon-theme')||'system';
  var d=s==='dark'||(s==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  if(d)document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme=d?'dark':'light';
}catch(e){}})();
`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{themeInitScript}</Script>
      </head>
      <body className={cn(inter.variable, "min-h-screen bg-background font-sans text-foreground antialiased")}>
        <ThemeProvider>
          <SWRProvider>
            <div className="flex">
              <Sidebar />
              <div className="flex-1 min-w-0">
                <MainShell>{children}</MainShell>
              </div>
            </div>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
