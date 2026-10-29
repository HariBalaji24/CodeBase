import "./globals.css"
import { Metadata } from "next"
import { AuthProvider } from "@/components/auth/AuthProvider"

export const metadata: Metadata = {
  title: "CodeBase",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#050506] text-white antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}