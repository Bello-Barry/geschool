import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/forms/login-form';
import { getSchoolFromHeaders } from '@/lib/utils/school-resolver';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { email?: string; returnUrl?: string };
}) {
  const supabase = createClient();
  const headersList = headers();
  
  // Vérifier si déjà connecté
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    redirect('/dashboard');
  }

  // Récupérer école depuis headers
  const school = getSchoolFromHeaders(headersList);

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
          prefilledEmail={searchParams.email}
          returnUrl={searchParams.returnUrl}
        />
      </div>
    </div>
  );
}