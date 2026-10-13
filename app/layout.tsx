import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "ScamTrail · Investigate before you trust",
  description: "Search a project, X handle, wallet or contract. See what the evidence says and what it leaves open.",
};

export const viewport: Viewport = { themeColor: "#0b0b0b", colorScheme: "dark" };

const INTRO = `(function(){try{if(location.pathname!=="/"||matchMedia("(prefers-reduced-motion: reduce)").matches)return;var d=document.documentElement;d.classList.add("intro");setTimeout(function(){d.classList.remove("intro")},2500)}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable} suppressHydrationWarning>
      <head>
        {/* Hide the hero until its GSAP intro plays, without a flash of the final state.
            Skipped under reduced motion; a timeout reveals it if scripts fail. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
