/**
 * @fileoverview Root Layout
 *
 * The single shared shell for all pages in the Qalb application.
 * Renders (in order):
 *  1. NavigationProgress — gold top-bar that plays on every route change
 *  2. SplashScreen       — bismillah intro animation (once per session)
 *  3. Navigation         — top header + bottom mobile tabs
 *  4. Page content       — the current route's page.js
 *  5. Toaster            — toast notifications
 *
 * Server Component — runs only on the server. Client-side interactivity
 * is encapsulated inside NavigationProgress and SplashScreen.
 */
import Navigation from "@/components/Navigation";
import NavigationProgress from "@/components/NavigationProgress";
import SplashScreen from "@/components/SplashScreen";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

export const metadata = {
  title: "Qalb — Your Daily Quran Companion",
  description:
    "Connect your daily life to the Quran with AI-powered verse discovery, streak tracking, and personal reflection. Build a lasting post-Ramadan habit.",
  keywords: ["Quran", "Islam", "daily verse", "Ramadan", "Quran app", "Muslim"],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
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
 * @param {{ children: React.ReactNode }} props
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* ── Gold progress bar — appears at top on every navigation ─── */}
        <NavigationProgress />

        {/* ── Bismillah splash — full-screen, shown once per session ──── */}
        <SplashScreen />

        {/* ── Top header + bottom mobile tab bar ───────────────────────── */}
        <Navigation />

        {/* ── Route page content ────────────────────────────────────────── */}
        {/* pb-20 reserves space for the fixed bottom mobile nav bar        */}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        {/* ── Toast notifications ───────────────────────────────────────── */}
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
