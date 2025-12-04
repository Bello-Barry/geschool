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
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

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
  };
  prefilledEmail?: string | undefined;
  returnUrl?: string | undefined;
}

export function LoginForm({ school, prefilledEmail, returnUrl }: LoginFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
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
        toast.success(`Bienvenue ${school.name} !`);
        
        // Rediriger vers la racine, le middleware s'occupera du reste
        setTimeout(() => {
          if (returnUrl) {
            router.push(returnUrl);
          } else {
            router.push('/');
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              style={{ backgroundColor: school.primary_color || '#3B82F6' } as React.CSSProperties}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
