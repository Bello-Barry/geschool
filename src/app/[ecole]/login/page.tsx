import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/forms/login-form';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Header } from '@/components/layout/public-navbar';
import { Footer } from '@/components/layout/footer';

export default async function SchoolLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ ecole: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { ecole } = await params;
  const sp = await searchParams;

  const adminClient = createAdminClient();
  const { data: school } = await adminClient
    .from('schools')
    .select('id, name, subdomain, primary_color')
    .eq('subdomain', ecole)
    .single();

  if (!school) {
    redirect('/school-not-found');
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Si l'utilisateur est déjà connecté et appartient à CETTE école → rediriger
  if (session?.user?.id) {
    const { data: user } = await adminClient
      .from('users')
      .select('role, school_id')
      .eq('id', session.user.id)
      .single();

    if (user && user.school_id === school.id) {
      // Super-admin : console plateforme racine, sans dépendance à l'école
      if (user.role === 'super_admin') {
        redirect('/super-admin');
      }
      const rolePath = user.role === 'admin_school' ? '/admin' : `/${user.role}`;
      redirect(`/${ecole}${rolePath}`);
    }
    // Sinon (école différente) → laisser le formulaire s'afficher
    // pour permettre à l'utilisateur de se connecter avec un autre compte
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-16 relative">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--primary)/0.08)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsl(var(--primary)/0.05)_0%,_transparent_50%)]" />
        </div>
        <div className="w-full max-w-md animate-fade-up">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-elevated"
                style={{ backgroundColor: school.primary_color || '#3B82F6' }}
              >
                <span className="text-white font-bold text-lg">
                  {school.name.charAt(0)}
                </span>
              </div>
              <h1 className="text-2xl font-bold font-heading">{school.name}</h1>
            </div>
            <h2 className="text-3xl font-bold font-heading">Connexion</h2>
            <p className="text-muted-foreground mt-2">
              Accédez à votre espace sécurisé
            </p>
          </div>

          <LoginForm
            school={school}
            prefilledEmail={sp.email}
            returnUrl={`/${ecole}`}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
