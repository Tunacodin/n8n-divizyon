import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Circle Dashboard - n8n Monitoring",
  description: "Circle community management dashboard with n8n integration",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <body className={cn(inter.className, "min-h-screen bg-gray-50")}>
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 p-6">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Circle</h1>
              <p className="text-sm text-gray-500">n8n Dashboard</p>
            </div>

            <nav className="space-y-2">
              <a
                href="/"
                className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                📊 Dashboard
              </a>
              <a
                href="/applications"
                className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                📝 Başvurular
              </a>
              <a
                href="/workflows"
                className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                ⚙️ Workflows
              </a>
              <a
                href="/members"
                className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                👥 Üyeler
              </a>
              <a
                href="/tests"
                className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                🧪 Testler
              </a>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
