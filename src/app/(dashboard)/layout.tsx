import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { getSchoolFromHeaders } from '@/lib/utils/school-resolver';
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 z-50">
        <Sidebar />
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Header */}
        <header className="border-b bg-background sticky top-0 z-40 w-full">
          <div className="px-4 md:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Mobile Sidebar Toggle */}
              <div className="md:hidden flex-shrink-0">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-64">
                    <Sidebar />
                  </SheetContent>
                </Sheet>
              </div>
              <h1 className="text-xl md:text-2xl font-bold truncate">
                Tableau de Bord
              </h1>
            </div>

            <Header />
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}