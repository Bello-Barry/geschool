'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Loader2, Building2, User, Save, Link as LinkIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

const createSchoolSchema = z.object({
  schoolName: z.string().min(1, { message: 'Nom de l\'école requis' }),
  subdomain: z.string().min(3, { message: 'Le sous-domaine doit contenir au moins 3 caractères' }).regex(/^[a-z0-9-]+$/, { message: 'Lettres minuscules, chiffres et tirets uniquement' }),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/, { message: 'Format hex (ex: #4F46E5)' }).optional(),
  firstName: z.string().min(1, { message: 'Prénom requis' }),
  lastName: z.string().min(1, { message: 'Nom requis' }),
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' }),
});

export function SuperAdminSchoolForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof createSchoolSchema>>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: {
      schoolName: '',
      subdomain: '',
      primaryColor: '#4F46E5',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof createSchoolSchema>) {
    setLoading(true);

    try {
      const response = await fetch('/api/super-admin/schools', {
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
        throw new Error(message || 'Erreur lors de la création');
      }

      toast.success('École créée avec succès !', {
        description: `Le sous-domaine ${values.subdomain}.localhost a été provisionné.`,
      });

      router.push('/super-admin/schools');
      router.refresh();

    } catch (error) {
      console.error('Create school error:', error);
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      });
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Section Établissement */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="bg-muted px-6 py-4 border-b flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Informations de l'Établissement</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nom complet de l'établissement</FormLabel>
                  <FormControl>
                    <Input placeholder="Lycée d'Excellence..." {...field} disabled={loading} />
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
                  <FormLabel>Sous-domaine</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <div className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground">
                        <LinkIcon className="h-4 w-4" />
                      </div>
                      <Input placeholder="lycee-excellence" {...field} disabled={loading} className="rounded-l-none" autoComplete="off" />
                    </div>
                  </FormControl>
                  <FormDescription>
                    L'URL sera: <strong>{field.value || "slug"}.geschool.com</strong>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primaryColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Couleur Principale (Hex)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded border shadow-sm shrink-0" 
                        style={{ backgroundColor: field.value || "#4F46E5" }}
                      />
                      <Input placeholder="#4F46E5" {...field} disabled={loading} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Section Administrateur */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="bg-muted px-6 py-4 border-b flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Compte du Directeur / Administrateur</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email professionnel</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@ecole.com" {...field} disabled={loading} type="email" />
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
                  <FormLabel>Mot de passe provisoire</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" {...field} disabled={loading} type="text" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Créer l'école et le compte
          </Button>
        </div>
      </form>
    </Form>
  );
}
