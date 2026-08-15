import type { Metadata, Viewport } from "next";
import { Newsreader, Inter, JetBrains_Mono } from "next/font/google";
import PWARegister from "./components/PWARegister";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vora — Nutrición Arquitectónica",
  description: "Plataforma de alta precisión y diseño editorial para tu nutrición y rendimiento.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vora",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${newsreader.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-[#09090b] text-[#f4f4f0] font-sans antialiased selection:bg-[#a3e635]/20 selection:text-[#a3e635]"
        suppressHydrationWarning
      >
        <span
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html:
              "<!-- VORA · HOME — RITUAL CHECKLIST. THESIS: the home tab is the day's check-in checklist, not a dashboard; it refuses equal-weight panels for one continuous column where calories, protein, and water are verdict rows and the food log is the detail below. OWN-WORLD: incumbent editorial-luxury tokens kept — near-black #09090b ground, Newsreader serif display, lime #a3e635 on-track accent, glass-floating panel, hairline dividers. STORY: the owner opens Vora at meal time and reads in two seconds whether the day is on track; the calories-remaining verdict dominates, the protein gap shows, water toggles by tap, and the next meal logs from the feed. FIRST VIEWPORT: one glass panel; the first, tallest row carries the calories-remaining verdict in text-6xl/7xl serif with a lime 'en camino' or red 'sobre meta' state; protein with its missing-grams note; water with glass toggles; today's food log below. FORM: ritual-checklist stack, candidate 5 of 7, seed key b6f71891. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md. -->",
          }}
        />
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
