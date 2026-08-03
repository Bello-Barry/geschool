import { Header } from '@/components/layout/public-navbar';
import { Footer } from '@/components/layout/footer';
import { SchoolDetectionForm } from '@/components/forms/school-detection-form';
import { StatsShowcase } from '@/components/dashboard/stats-showcase';
import { Features } from '@/components/layout/features';
import { HeroBackground } from '@/components/layout/hero-background';
import { SectionDivider } from '@/components/layout/section-divider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16 md:py-28 text-center relative overflow-x-hidden">
          <HeroBackground />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/50 text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Plateforme #1 au Congo-Brazzaville
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6 font-heading leading-tight max-w-4xl mx-auto text-marine-900">
            Gestion Scolaire
            <span className="text-primary block mt-1 sm:mt-2">Simplifiée. Intelligente. Congolaise.</span>
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
            Notes, présences, paiements, communication parents-enseignants et IA
            &mdash; le tout dans une plateforme unique conçue pour le Congo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-up">
            <Button asChild size="lg" className="text-lg px-8 shadow-lg shadow-primary/20">
              <Link href="/register">Créer mon établissement</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8">
              <Link href="#detect-school">Accéder à mon espace</Link>
            </Button>
          </div>

          <div id="detect-school" className="max-w-md mx-auto pt-8">
            <div className="bg-card p-6 rounded-xl border shadow-sm">
              <h2 className="text-xl font-semibold mb-4 font-heading">Déjà inscrit ?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Entrez votre email pour retrouver votre établissement.
              </p>
              <SchoolDetectionForm />
            </div>
          </div>
        </section>

        <Features />
        <SectionDivider />
        <StatsShowcase />
      </main>
      <Footer />
    </div>
  );
}
