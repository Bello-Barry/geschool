'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
});

export function SchoolDetectionForm() {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    mode: "onTouched",
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    
    try {
      const response = await fetch('/api/detect-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'École non trouvée');
      }

      if (data.platform) {
        toast.success('Compte plateforme', {
          description: 'Redirection vers la console GESchool...',
        });
        setTimeout(() => {
          window.location.href = `/login?email=${encodeURIComponent(values.email)}`;
        }, 1500);
      } else if (data.subdomain) {
        toast.success('École trouvée !', {
          description: `Redirection vers ${data.schoolName}...`,
        });
        setTimeout(() => {
          window.location.href = `/${data.subdomain}/login?email=${encodeURIComponent(values.email)}`;
        }, 1500);
      } else {
        throw new Error('École non associée');
      }
    } catch (error) {
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : 'Erreur de détection',
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  placeholder="votre@email.com" 
                  {...field} 
                  disabled={loading}
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
