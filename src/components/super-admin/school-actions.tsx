'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PowerOff, Power, Trash2, Loader2 } from 'lucide-react';
import { AttachDirectorDialog } from '@/components/super-admin/attach-director-dialog';

interface SchoolActionsProps {
  schoolId: string;
  schoolName: string;
  isActive: boolean;
  hasDirector?: boolean;
}

export function SchoolActions({ schoolId, schoolName, isActive, hasDirector }: SchoolActionsProps) {
  const [loading, setLoading] = useState<'toggle' | 'delete' | null>(null);
  const router = useRouter();

  async function toggleActive() {
    setLoading('toggle');
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (!res.ok) throw new Error('Erreur lors de la mise à jour');

      toast.success(isActive ? 'École désactivée' : 'École activée', {
        description: `${schoolName} a été ${isActive ? 'suspendu' : 'réactivé'} avec succès.`,
      });
      router.refresh();
    } catch {
      toast.error('Erreur', { description: 'Impossible de modifier le statut.' });
    } finally {
      setLoading(null);
    }
  }

  async function deleteSchool() {
    setLoading('delete');
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');

      toast.success('École supprimée', {
        description: `${schoolName} a été définitivement supprimé.`,
      });
      router.push('/super-admin/schools');
      router.refresh();
    } catch {
      toast.error('Erreur', { description: 'Impossible de supprimer cette école.' });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Attacher un directeur si l'école n'en a pas */}
      {hasDirector === false && (
        <AttachDirectorDialog schoolId={schoolId} schoolName={schoolName} />
      )}

      {/* Toggle Active / Inactive */}
      <Button
        variant={isActive ? 'outline' : 'default'}
        size="sm"
        onClick={toggleActive}
        disabled={loading !== null}
        className={isActive ? 'border-orange-300 text-orange-600 hover:bg-orange-50' : 'bg-emerald-600 hover:bg-emerald-700'}
      >
        {loading === 'toggle' ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : isActive ? (
          <PowerOff className="h-4 w-4 mr-2" />
        ) : (
          <Power className="h-4 w-4 mr-2" />
        )}
        {isActive ? 'Désactiver' : 'Réactiver'}
      </Button>

      {/* Delete with confirmation */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50" disabled={loading !== null}>
            {loading === 'delete' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Supprimer
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement cette école ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est <strong>irréversible</strong>. L'école <strong>{schoolName}</strong> et toutes ses données
              (élèves, notes, paiements...) seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSchool}
              className="bg-red-600 hover:bg-red-700"
            >
              Oui, supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
