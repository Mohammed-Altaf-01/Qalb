/**
 * @fileoverview Root Layout
 *
 * The single shared shell for all pages in the Qalb application.
 * Renders the top navigation bar, bottom mobile nav, and the Sonner
 * toast notification container.
 *
 * This is a Next.js App Router Server Component — it runs only on
 * the server and wraps every page automatically.
 */
import Navigation from "@/components/Navigation";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

export const metadata = {
  title: "Qalb — Your Daily Quran Companion",
  description:
    "Connect your daily life to the Quran with AI-powered verse discovery, streak tracking, and personal reflection. Build a lasting post-Ramadan habit.",
  keywords: ["Quran", "Islam", "daily verse", "Ramadan", "Quran app", "Muslim"],
  openGraph: {
    title: "Qalb — Your Daily Quran Companion",
    description: "Build a lasting relationship with the Quran beyond Ramadan.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a5c4a",
};

/**
 * Root layout wraps all pages with:
 *  - Global CSS (Islamic dark theme + Google Fonts)
 *  - Top navigation header
 *  - Bottom mobile navigation bar
 *  - Toast notification provider
 *
 * @param {{ children: React.ReactNode }} props
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* ── Top Navigation Bar ─────────────────────────────────────── */}
        <Navigation />

        {/* ── Page Content ───────────────────────────────────────────── */}
        {/* pb-20 reserves space for the fixed bottom mobile nav bar     */}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        {/* ── Toast Notifications ────────────────────────────────────── */}
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "oklch(0.16 0.03 155)",
              border: "1px solid oklch(1 0 0 / 8%)",
              color: "oklch(0.95 0.01 90)",
            },
          }}
        />
      </body>
    </html>
  );
}
