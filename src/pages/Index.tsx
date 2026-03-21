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
    <div className="relative min-h-screen overflow-x-hidden scroll-smooth bg-[#0A0F1F] text-[#F8FAFC]">
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
