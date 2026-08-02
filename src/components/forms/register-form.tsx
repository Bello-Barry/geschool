'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft, Check, Building2, User } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const accountSchema = z.object({
  firstName: z.string().min(1, { message: 'Prénom requis' }),
  lastName: z.string().min(1, { message: 'Nom requis' }),
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' }),
});

const schoolSchema = z.object({
  schoolName: z.string().min(1, { message: 'Nom de l\'école requis' }),
  subdomain: z.string().min(3, { message: 'Le sous-domaine doit contenir au moins 3 caractères' }).regex(/^[a-z0-9-]+$/, { message: 'Lettres minuscules, chiffres et tirets uniquement' }),
});

const registerSchema = accountSchema.merge(schoolSchema);

const steps = [
  { id: 'account', label: 'Compte', icon: User },
  { id: 'school', label: 'Établissement', icon: Building2 },
] as const;

function FormDescription({ children, className }: { children: React.ReactNode, className?: string }) {
    return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
}

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'account' | 'school'>('account');

  const form = useForm<z.infer<typeof registerSchema>>({
    mode: "onTouched",
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      schoolName: '',
      subdomain: '',
    },
  });

  const { trigger, getValues, reset } = form;

  async function goNext() {
    const ok = await trigger(['firstName', 'lastName', 'email', 'password']);
    if (ok) setStep('school');
  }

  function goBack() {
    setStep('account');
  }

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        const fields = data.error || data.message;
        const message = typeof fields === 'object' && fields !== null
          ? Object.values(fields as Record<string, string[]>).flat()[0]
          : fields;
        throw new Error(message || 'Erreur lors de la création du compte');
      }

      setSuccess(true);
      toast.success('Succès !', {
        description: 'Établissement créé avec succès ! Redirection...',
      });

      const emailEncoded = encodeURIComponent(values.email);
      setTimeout(() => {
        window.location.href = `/${values.subdomain}/login?email=${emailEncoded}`;
      }, 1500);

    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      });
      // Retour sur la première étape pour corriger
      setStep('account');
      setLoading(false);
      reset({ ...getValues() });
    }
  }

  const currentStepIndex = step === 'account' ? 0 : 1;

  return (
    <Card className="text-left shadow-elevated">
      <CardContent className="pt-6">
        {/* Indicateur de progression */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = i < currentStepIndex;
              return (
                <div key={s.id} className="flex items-center gap-3 flex-1 last:flex-none">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300",
                        isDone ? 'bg-success text-success-foreground' : isActive
                          ? 'bg-primary text-primary-foreground shadow-brand-glow'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={cn(
                      "text-sm font-medium hidden sm:block",
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full bg-primary transition-all duration-500", isDone ? "w-full" : "w-0")}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Étape {currentStepIndex + 1} sur {steps.length} — {steps[currentStepIndex].label}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Étape 1 : Compte administrateur */}
            <div className={cn("space-y-4", step !== 'account' && "hidden")}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean" {...field} disabled={loading} autoComplete="given-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Dupont" {...field} disabled={loading} autoComplete="family-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email professionnel</FormLabel>
                    <FormControl>
                      <Input placeholder="directeur@ecole.com" {...field} disabled={loading} type="email" autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" {...field} disabled={loading} type="password" autoComplete="new-password" />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Au moins 6 caractères — ce sera votre accès d'administrateur.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                onClick={goNext}
                className="w-full h-12 text-lg"
                disabled={loading}
              >
                Continuer <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Étape 2 : Établissement */}
            <div className={cn("space-y-4", step !== 'school' && "hidden")}>
              <FormField
                control={form.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'établissement</FormLabel>
                    <FormControl>
                      <Input placeholder="Lycée de Brazzaville" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subdomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sous-domaine souhaité</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input placeholder="lycee-brazza" {...field} disabled={loading} className="flex-1 min-w-0" autoComplete="off" />
                        <span className="text-muted-foreground text-sm shrink-0">.localhost</span>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      L'URL de votre école sera : <strong>{field.value || "slug"}.localhost</strong>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  className="h-12"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" /> Retour
                </Button>
                <Button type="submit" className="h-12 text-lg" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Création...</>
                  ) : success ? (
                    <><CheckCircle2 className="h-4 w-4" /> Redirection...</>
                  ) : 'Créer mon établissement'}
                </Button>
              </div>
            </div>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm">
            Vous avez déjà un établissement ?{' '}
            <Link href="/#detect-school" className="font-semibold text-primary hover:underline">
                Se connecter
            </Link>
        </div>
      </CardContent>
    </Card>
  );
}