import { Geist, JetBrains_Mono } from "next/font/google"
import { createClient } from "@/lib/supabase/server"
import { AuthProvider } from "@/components/auth/AuthProvider"
import { Toaster } from "sonner"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const initialUser = user ?? null

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontSans.variable,
        "font-mono",
        jetbrainsMono.variable
      )}
    >
      <body>
        <ThemeProvider>
          <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
          <Toaster position="bottom-center" theme="dark" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
