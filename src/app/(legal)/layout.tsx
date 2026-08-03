import { Header } from '@/components/layout/public-navbar';
import { Footer } from '@/components/layout/footer';
import { PageTransition } from '@/components/layout/page-transition';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PageTransition>
        <Header />
        <main className="flex-1">
          <div className="container px-4 py-12 md:py-16 max-w-3xl mx-auto">
            {children}
          </div>
        </main>
        <Footer />
      </PageTransition>
    </div>
  );
}
