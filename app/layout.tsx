import type { Metadata } from "next";
import {
  Bebas_Neue,
  Russo_One,
  Inter,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { Header } from "./components/layout/Header";

const displayPrimary = Bebas_Neue({
  variable: "--font-display-primary",
  subsets: ["latin", "cyrillic"],
  weight: "400",
});

const displayAlt = Russo_One({
  variable: "--font-display-alt",
  subsets: ["latin", "cyrillic"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "MELARDO WARFACE | Киберспортивная платформа",
  description: "Соревнования, турниры, рейтинги, лиги. Только честная игра.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="min-h-full">
      <body
        className={`${displayPrimary.variable} ${displayAlt.variable} ${inter.variable} ${jetBrainsMono.variable} antialiased bg-gradient-to-br from-[#0A0C0F] to-[#1A1E24] text-white`}
      >
        <Header />
        <main className="mx-auto max-w-5xl px-4 pb-12 pt-6">{children}</main>
      </body>
    </html>
  );
}
