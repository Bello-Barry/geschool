import { Header } from '@/components/layout/public-navbar';
import { Footer } from '@/components/layout/footer';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-16 relative">
        {/* Fond décoratif cohérent avec la page d'accueil */}
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--primary)/0.08)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsl(var(--primary)/0.05)_0%,_transparent_50%)]" />
        </div>
        <div className="w-full max-w-md animate-fade-up">{children}</div>
      </main>
      <Footer />
    </div>
  );
}