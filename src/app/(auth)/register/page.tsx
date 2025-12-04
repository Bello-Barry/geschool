import { RegisterForm } from '@/components/forms/register-form';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Créer un compte</h1>
          <p className="text-muted-foreground mt-2">
            Créez votre compte super_admin et votre première école.
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
