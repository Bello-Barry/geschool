import { Header } from '@/components/layout/public-navbar';
import { Footer } from '@/components/layout/footer';
import { SchoolDetectionForm } from '@/components/forms/school-detection-form';
import { StatsShowcase } from '@/components/dashboard/stats-showcase';
import { Features } from '@/components/layout/features';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/register">Créer mon établissement</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8">
              <Link href="#detect-school">Accéder à mon espace</Link>
            </Button>
          </div>

          <div id="detect-school" className="max-w-md mx-auto pt-12">
            <div className="bg-muted/50 p-6 rounded-xl border">
              <h2 className="text-xl font-semibold mb-4">Déjà inscrit ?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Entrez votre email pour retrouver votre établissement.
              </p>
              <SchoolDetectionForm />
            </div>
          </div>
        </section>

        <Features />
        <StatsShowcase />
      </main>
      <Footer />
    </div>
  );
}