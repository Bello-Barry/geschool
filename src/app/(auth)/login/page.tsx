import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/forms/login-form';

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

  // NB : on ne redirige PAS automatiquement si une session existe déjà.
  // Le formulaire reste actif pour permettre le changement de compte
  // (voir login-form.tsx : la soumission vérifie TOUJOURS les identifiants saisis).

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