'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createClient } from '@/lib/supabase/client';

const formSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Mot de passe requis' }),
});

export function SchoolDetectionForm() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const email = values.email.trim().toLowerCase();
    console.log('Tentative de connexion pour détection d\'école:', email);
    
    try {
      // 1. Authentifier l'utilisateur d'abord (Option C)
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      });

      if (authError) {
        console.error('Erreur d\'authentification:', authError.message);
        throw new Error('Email ou mot de passe incorrect');
      }

      console.log('Authentification réussie. Recherche de l\'établissement...');

      // 2. Rechercher l'établissement maintenant que la session est active (RLS passera)
      const response = await fetch('/api/detect-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Erreur API détection:', data.error);
        throw new Error(data.error || 'Établissement non trouvé');
      }

      if (data.subdomain) {
        console.log('Établissement trouvé:', data.schoolName, '(', data.subdomain, ')');

        const hostname = window.location.hostname;
        const port = window.location.port;
        const protocol = window.location.protocol;

        let redirectUrl = '';
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          redirectUrl = `${protocol}//${data.subdomain}.localhost${port ? `:${port}` : ''}/dashboard`;
        } else {
          const domainParts = hostname.split('.');
          const baseDomain = domainParts.length > 2 ? domainParts.slice(-2).join('.') : hostname;
          redirectUrl = `${protocol}//${data.subdomain}.${baseDomain}/dashboard`;
        }

        toast({
          title: 'Connexion réussie !',
          description: `Bienvenue chez ${data.schoolName}. Redirection...`,
        });

        console.log('Redirection vers:', redirectUrl);

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1500);
      } else {
        throw new Error('Établissement non associé à ce compte');
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur de détection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }: { field: Record<string, unknown> }) => (
            <FormItem>
              <FormLabel>Email professionnel</FormLabel>
              <FormControl>
                <Input 
                  placeholder="votre@email.com" 
                  {...field} 
                  disabled={loading}
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
                <Input
                  placeholder="••••••••"
                  {...field}
                  disabled={loading}
                  type="password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Recherche...' : 'Accéder à mon école'}
        </Button>
      </form>
    </Form>
  );
}
