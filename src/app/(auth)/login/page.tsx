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
      const { data: school } = await adminClient
        .from("schools")
        .select("subdomain")
        .eq("id", user.school_id)
        .single();
      if (school) {
        const rolePath = user.role === "super_admin" || user.role === "admin_school" ? "/admin" : `/${user.role}`;
        redirect(`/${school.subdomain}${rolePath}`);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">Connexion</h2>
          <p className="text-muted-foreground mt-2">
            Accédez à votre espace sécurisé
          </p>
        </div>

        <LoginForm
          school={null}
          prefilledEmail={params.email}
          returnUrl={params.returnUrl}
        />
      </div>
    </div>
  );
}