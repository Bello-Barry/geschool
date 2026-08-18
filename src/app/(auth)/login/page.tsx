import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/forms/login-form';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; returnUrl?: string; school?: string }>;
}) {
  const params = await searchParams;

  // Rediriger vers la page de connexion spécifique à l'école si un slug est fourni
  if (params.school) {
    redirect(`/${params.school}/login${params.email ? `?email=${encodeURIComponent(params.email)}` : ''}`);
  }

  // Rediriger si déjà connecté
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) {
    const adminClient = createAdminClient();
    const { data: user } = await adminClient
      .from("users")
      .select("role, school_id")
      .eq("id", session.user.id)
      .single();
if (user) {
        // Super-admin : console plateforme racine, sans dépendance à l'école
        if (user.role === "super_admin") {
          redirect("/super-admin");
        }
        const { data: school } = await adminClient
          .from("schools")
          .select("subdomain")
          .eq("id", user.school_id)
          .single();
        if (school) {
          const rolePath = user.role === "admin_school" ? "/admin" : `/${user.role}`;
          redirect(`/${school.subdomain}${rolePath}`);
        }
      }
  }

  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l9 4.5v7c0 4.5-3.3 7.7-9 10.5-5.7-2.8-9-6-9-10.5v-7L12 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12l1.8 1.8 3.2-3.4" />
        </svg>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold font-heading mb-2">Connexion</h1>
      <p className="text-muted-foreground mb-8">
        Accédez à votre espace sécurisé
      </p>

      <LoginForm
        school={null}
        prefilledEmail={params.email}
        returnUrl={params.returnUrl}
      />
    </div>
  );
}