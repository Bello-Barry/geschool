import { Header } from '@/components/layout/public-navbar';
import { Footer } from '@/components/layout/footer';
import { SchoolDetectionForm } from '@/components/forms/school-detection-form';
import { StatsShowcase } from '@/components/dashboard/stats-showcase';
import { Features } from '@/components/layout/features';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="container px-4 py-24 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Gestion Scolaire
            <span className="text-primary block">Pour le Congo-Brazzaville</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            La plateforme complète pour gérer vos établissements scolaires avec notes, présences, 
            paiements et intelligence artificielle.
          </p>
          
          <div id="detect-school" className="max-w-md mx-auto">
            <SchoolDetectionForm />
          </div>
        </section>

        <Features />
        <StatsShowcase />
      </main>
      <Footer />
    </div>
  );
}