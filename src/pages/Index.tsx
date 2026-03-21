import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import ProductJourneySection from "@/components/ProductJourneySection";
import DemoSection from "@/components/DemoSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden scroll-smooth bg-background text-foreground">
      {/* Ambient depth: soft glows + faint grid (fixed so sections stay readable) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -top-[38%] left-1/2 h-[min(85vh,52rem)] w-[min(140vw,80rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(239_84%_67%/0.16),transparent_68%)] blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-15%] h-[min(60vh,28rem)] w-[min(90vw,42rem)] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(258_90%_66%/0.12),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-[18%] left-[-10%] h-[min(45vh,22rem)] w-[min(70vw,28rem)] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(204_100%_50%/0.08),transparent_72%)] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.4] [background-image:linear-gradient(to_right,hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.4)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]"
          aria-hidden
        />
      </div>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <FeaturesSection />
        <ProductJourneySection />
        <DemoSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
