import { LandingHeader } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero"
import { FeaturesSection } from "@/components/landing/features"
import { CyclesSection } from "@/components/landing/cycles"
import { PricingSection } from "@/components/landing/pricing"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <LandingHeader />
      <HeroSection />
      <CyclesSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </div>
  )
}
