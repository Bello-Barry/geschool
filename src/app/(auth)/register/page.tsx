import { RegisterForm } from '@/components/forms/register-form';

export default function RegisterPage() {
  return (
    <div className="text-center animate-fade-up">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M9 8l3-3 3 3m-3-3v12" />
        </svg>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold font-heading mb-2">
        Créer mon établissement
      </h1>
      <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
        Créez votre compte administrateur et votre première école en quelques minutes.
      </p>
      <RegisterForm />
    </div>
  );
}
