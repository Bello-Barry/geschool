'use client';

import { useState, useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Mot de passe requis' }),
});

interface LoginFormProps {
  school: {
    id: string;
    name: string;
    subdomain: string | null;
    primary_color?: string | null;
  } | null;
  prefilledEmail?: string | undefined;
  returnUrl?: string | undefined;
}

export function LoginForm({ school, prefilledEmail, returnUrl }: LoginFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [existingSession, setExistingSession] = useState<{ email: string | null } | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Détecte une session déjà active (sans court-circuiter le formulaire).
  // Le formulaire reste utilisable pour changer de compte : la soumission
  // vérifie TOUJOURS les identifiants saisis, jamais la session existante.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setExistingSession({ email: session.user.email ?? null });
      }
    });
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const form = useForm<z.infer<typeof loginSchema>>({
    mode: "onTouched",
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: prefilledEmail || '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setLoading(true);
    
    try {
      const supabase = createClient();
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("is_active, role")
          .eq("id", data.user.id)
          .single();

        if (userData && userData.is_active === false) {
          await supabase.auth.signOut();
          toast.error("Compte désactivé", {
            description: "Ce compte a été désactivé. Veuillez contacter votre administrateur.",
          });
          setLoading(false);
          return;
        }

        setSuccess(true);
        toast.success('Connexion réussie', {
          description: school ? `Bienvenue ${school.name} !` : 'Bienvenue !',
        });
        
        setTimeout(() => {
          const role = (userData?.role ?? data.user.user_metadata?.role ?? data.user.app_metadata?.role) as string | undefined;
          let destination = returnUrl || "/";

          if (role === "super_admin") {
            destination = "/super-admin";
          } else if (role && school?.subdomain) {
            const rolePath = role === "admin_school" ? "/admin" : `/${role}`;
            destination = returnUrl || `/${school.subdomain}${rolePath}`;
          } else if (role) {
            destination = `/${role}`;
          } else {
            destination = "/login";
          }

          window.location.href = destination;
        }, 1000);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erreur', {
        description: 'Email ou mot de passe incorrect',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-elevated">
      <CardContent className="pt-6">
        {existingSession && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">Vous êtes déjà connecté{existingSession.email ? ` en tant que ${existingSession.email}` : ""}.</p>
            <p className="mt-1 text-amber-800">
              Pour changer de compte, connectez-vous ci-dessous avec un autre identifiant, ou&nbsp;
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="font-semibold underline underline-offset-2 disabled:opacity-60"
              >
                {signingOut ? "Déconnexion…" : "se déconnecter"}
              </button>
              .
            </p>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-left">
            <FormField
              control={form.control}
              name="email"
              render={({ field }: { field: Record<string, unknown> }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="votre@email.com" 
                      {...field}
                      disabled={loading || !!prefilledEmail}
                      type="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }: { field: Record<string, unknown> }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="••••••••" 
                        {...field}
                        disabled={loading}
                        type={showPassword ? 'text' : 'password'}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 w-7 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              style={school?.primary_color ? { backgroundColor: school.primary_color } : undefined}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Connexion...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Redirection...
                </>
              ) : 'Se connecter'}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Vous n'avez pas de compte?{' '}
          <Link href="/register" className="underline">
            S'inscrire
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
