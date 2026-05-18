import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { LoginForm } from '@/components/forms/login-form';
import { getSchoolFromHeaders } from '@/lib/utils/school-resolver';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; returnUrl?: string; school?: string }>;
}) {
  const supabase = await createClient();
  const headersList = await headers();
  const params = await searchParams;
  
  // Vérifier si déjà connecté
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    redirect('/');
  }

  // Récupérer école depuis headers
  const schoolData = await getSchoolFromHeaders(headersList);
  let school = schoolData;

  // Fallback for hosts where wildcard subdomains are unavailable (e.g. *.vercel.app)
  if (!school && params.school) {
    const admin = createAdminClient();
    const { data: fallbackSchool } = await admin
      .from('schools')
      .select('id, name, subdomain, primary_color')
      .eq('subdomain', params.school)
      .maybeSingle();
    school = fallbackSchool;
  }

  if (!school) {
    redirect('/school-not-found');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {school && (
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
          )}
          <h2 className="text-3xl font-bold">Connexion</h2>
          <p className="text-muted-foreground mt-2">
            Accédez à votre espace sécurisé
          </p>
        </div>

        <LoginForm 
          school={school}
          prefilledEmail={params.email}
          returnUrl={params.returnUrl}
        />
      </div>
    </div>
  );
}
