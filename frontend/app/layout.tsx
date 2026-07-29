import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { MeshBackground } from "@/components/background/MeshBackground";
import { NavBar } from "@/components/nav/NavBar";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vertex — Merge Competing Solutions",
  description:
    "Vertex is a bounty marketplace where a GenLayer Intelligent Contract evaluates every submission, builds a Contribution Graph, and distributes rewards proportionally.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body min-h-screen">
        <Providers>
          <MeshBackground />
          <NavBar />
          <main className="relative z-10 pt-24 pb-16 px-4 md:px-8 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
