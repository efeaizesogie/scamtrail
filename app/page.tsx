import { Nav } from "@/components/Nav";
import { Reveals } from "@/components/Reveals";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Hero } from "@/components/sections/Hero";
import { Walk } from "@/components/sections/Walk";
import { Thread } from "@/components/sections/Thread";
import { HandleHistory } from "@/components/sections/HandleHistory";
import { Spectrum } from "@/components/sections/Spectrum";
import { Fog } from "@/components/sections/Fog";
import { Chain } from "@/components/sections/Chain";
import { Report } from "@/components/sections/Report";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Trust, FinalCta, Footer } from "@/components/sections/Closing";

export default function Page() {
  return (
    <>
      <a href="#main" className="skip-link btn-primary">
        SKIP TO CONTENT
      </a>
      <Reveals />
      <SmoothScroll />
      <Nav />
      <main id="main">
        <Hero />
        <Walk />
        <Thread />
        <HandleHistory />
        <Spectrum />
        <Fog />
        <Chain />
        <Report />
        <HowItWorks />
        <Trust />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
