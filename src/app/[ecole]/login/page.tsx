import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/forms/login-form';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
      const rolePath = user.role === 'super_admin' || user.role === 'admin_school' ? '/admin' : `/${user.role}`;
      redirect(`/${ecole}${rolePath}`);
    }
    // Sinon (école différente) → laisser le formulaire s'afficher
    // pour permettre à l'utilisateur de se connecter avec un autre compte
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: school.primary_color || '#3B82F6' }}
            >
              <span className="text-white font-bold text-lg">
                {school.name.charAt(0)}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{school.name}</h1>
          </div>
          <h2 className="text-3xl font-bold">Connexion</h2>
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
    </div>
  );
}
