import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Header } from "@/components/Header"
import { MainShell } from "@/components/MainShell"
import { SWRProvider } from "@/components/SWRProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Divizyon - Basvuru Yonetim Paneli",
  description: "Divizyon Acik Inovasyon Agi uye basvuru yonetim sistemi",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <body className={cn(inter.className, "min-h-screen bg-[#FAFBFC]")}>
        <SWRProvider>
          <Header />
          <MainShell>{children}</MainShell>
        </SWRProvider>
      </body>
    </html>
  )
}
