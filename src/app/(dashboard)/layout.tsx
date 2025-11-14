import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { getSchoolFromHeaders } from '@/lib/utils/school-resolver';
import { Toaster } from '@/components/ui/toaster';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Vérifier session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Récupérer info utilisateur
  const { data: user } = await supabase
    .from('users')
    .select('role, first_name, last_name, avatar_url')
    .eq('id', session.user.id)
    .single();

  if (!user) {
    redirect('/login');
  }

  // Récupérer école depuis headers
  const headersList = await headers();
  const school = await getSchoolFromHeaders(headersList);

  if (!school) {
    redirect('/school-not-found');
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex h-full w-64 flex-col fixed inset-y-0 z-50">
        <Sidebar />
      </div>
      
      {/* Main content */}
      <div className="flex-1 md:pl-64 flex flex-col">
        {/* Header */}
        <Header />
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}