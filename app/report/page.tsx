import { Suspense } from "react";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Reveals } from "@/components/Reveals";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Footer } from "@/components/sections/Closing";
import { ReportView } from "@/components/report/ReportView";

export const metadata: Metadata = {
  title: "Report · ScamTrail",
  description: "Evidence-based report on an X handle, wallet, contract or domain. Every finding carries its source and the limits of the check.",
  robots: { index: false },
};

export default function ReportPage() {
  return (
    <>
      <a href="#main" className="skip-link btn-primary">SKIP TO CONTENT</a>
      <Reveals />
      <SmoothScroll />
      <Nav home="/" />
      <main id="main" className="min-h-screen">
        <Suspense fallback={null}>
          <ReportView />
        </Suspense>
      </main>
      <Footer home="/" />
    </>
  );
}
