import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales — GESchool',
  description: "Informations légales relatives à l'application GESchool, plateforme de gestion scolaire au Congo-Brazzaville.",
};

export default function MentionsLegalesPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-heading">Mentions légales</h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : août 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">Éditeur</h2>
        <p className="text-muted-foreground leading-relaxed">
          L'application GESchool est éditée et exploitée par GESchool SARL, société de droit congolais, dont le siège
          social est situé à Brazzaville, République du Congo.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Contact : <a href="mailto:info@geschool.cd" className="text-primary hover:underline">info@geschool.cd</a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">Directeur de la publication</h2>
        <p className="text-muted-foreground leading-relaxed">
          Le directeur de la publication est le représentant légal de GESchool SARL.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">Hébergement</h2>
        <p className="text-muted-foreground leading-relaxed">
          Le site et l'application sont hébergés sur l'infrastructure cloud de Vercel Inc., 340 S Lemon Ave #4133,
          Walnut, CA 91789, États-Unis. Les données peuvent transiter par des serveurs situés dans différentes régions
          du monde.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">Propriété intellectuelle</h2>
        <p className="text-muted-foreground leading-relaxed">
          L'ensemble des éléments composant l'application GESchool (textes, logos, interfaces, marques, données
          techniques) sont la propriété exclusive de GESchool SARL, sauf mention contraire. Toute reproduction,
          représentation ou diffusion, totale ou partielle, sans autorisation écrite préalable est interdite.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">Responsabilité</h2>
        <p className="text-muted-foreground leading-relaxed">
          GESchool s'efforce d'assurer l'exactitude et la mise à jour des informations publiées, mais ne saurait être
          tenue responsable des erreurs, omissions ou indisponibilités temporaires du service. Les établissements
          utilisateurs demeurent responsables des données qu'ils saisissent dans la plateforme.
        </p>
      </section>
    </article>
  );
}
