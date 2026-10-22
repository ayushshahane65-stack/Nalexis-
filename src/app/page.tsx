import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ContinueReadingSection from "@/components/ContinueReadingSection";
import RecommendedSection from "@/components/RecommendedSection";
import FeaturesSection from "@/components/FeaturesSection";
import ReadingCirclesSection from "@/components/ReadingCirclesSection";
import CommunitiesSection from "@/components/CommunitiesSection";
import CtaBanner from "@/components/CtaBanner";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text)] transition-colors duration-200">
      <Navbar />
      <main id="main-content" className="flex-1">
        <Hero />
        <ContinueReadingSection />
        <RecommendedSection />
        <FeaturesSection />
        <ReadingCirclesSection />
        <CommunitiesSection />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
