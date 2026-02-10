
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

const registerSchema = z.object({
  firstName: z.string().min(1, { message: 'Prénom requis' }),
  lastName: z.string().min(1, { message: 'Nom requis' }),
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' }),
  schoolName: z.string().min(1, { message: 'Nom de l\'école requis' }),
  subdomain: z.string().min(3, { message: 'Le sous-domaine doit contenir au moins 3 caractères' }).regex(/^[a-z0-9-]+$/, { message: 'Le sous-domaine ne peut contenir que des lettres minuscules, des chiffres et des tirets' }),
});

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
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
        throw new Error(data.error || 'Erreur lors de la création du compte');
      }

      toast.success('Établissement créé avec succès ! Redirection...');

      // Construire l'URL du sous-domaine
      const hostname = window.location.hostname;
      const port = window.location.port;
      const protocol = window.location.protocol;

      let newUrl = '';
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        newUrl = `${protocol}//${values.subdomain}.localhost${port ? `:${port}` : ''}/admin`;
      } else {
        // En production, on suppose que le domaine est quelque chose comme geschool.com
        const domainParts = hostname.split('.');
        const baseDomain = domainParts.slice(-2).join('.');
        newUrl = `${protocol}//${values.subdomain}.${baseDomain}/admin`;
      }

      // Petite pause pour laisser l'utilisateur voir le message de succès
      setTimeout(() => {
        window.location.href = newUrl;
      }, 1500);

    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean" {...field} disabled={loading} />
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
                      <Input placeholder="Dupont" {...field} disabled={loading} />
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
                    <Input placeholder="directeur@ecole.com" {...field} disabled={loading} type="email" />
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
                    <Input placeholder="••••••••" {...field} disabled={loading} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <hr className="my-4" />
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
                      <Input placeholder="lycee-brazza" {...field} disabled={loading} />
                      <span className="text-muted-foreground text-sm">.geschool.cd</span>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    C'est l'adresse web unique de votre école.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
              {loading ? 'Création de l\'espace...' : 'Créer mon établissement'}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
            Vous avez déjà un établissement ?{' '}
            <Link href="/#detect-school" className="font-semibold text-primary hover:underline">
                Se connecter
            </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function FormDescription({ children, className }: { children: React.ReactNode, className?: string }) {
    return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
}
