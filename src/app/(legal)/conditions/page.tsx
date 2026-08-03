import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions générales d\'utilisation — GESchool',
  description: "Conditions générales d'utilisation de la plateforme GESchool pour les établissements scolaires.",
};

export default function ConditionsPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-heading">Conditions générales d&apos;utilisation</h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : août 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">1. Objet</h2>
        <p className="text-muted-foreground leading-relaxed">
          Les présentes conditions générales d'utilisation régissent l'accès et l'utilisation de la plateforme GESchool,
          application de gestion scolaire destinée aux établissements d'enseignement de la République du Congo.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">2. Acceptation des conditions</h2>
        <p className="text-muted-foreground leading-relaxed">
          L'utilisation de GESchool implique l'acceptation pleine et entière des présentes conditions. En cas de
          désaccord, l'utilisateur est invité à cesser toute utilisation de la plateforme.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">3. Compte utilisateur</h2>
        <p className="text-muted-foreground leading-relaxed">
          L'utilisateur s'engage à fournir des informations exactes lors de la création de son compte et à maintenir la
          confidentialité de ses identifiants. Chaque compte est personnel et ne peut être partagé. L'établissement
          administrateur est responsable de la gestion des comptes de son personnel.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">4. Obligations de l&apos;établissement</h2>
        <p className="text-muted-foreground leading-relaxed">
          L'établissement s'engage à : utiliser la plateforme conformément à sa destination, garantir l'exactitude des
          données saisies, informer les élèves et parents de l'utilisation de leurs données, et respecter la législation
          en vigueur applicable à l'éducation et à la protection des données.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">5. Disponibilité du service</h2>
        <p className="text-muted-foreground leading-relaxed">
          GESchool s'efforce d'assurer un service continu et de qualité, sans toutefois pouvoir garantir une
          disponibilité absolue. Des opérations de maintenance peuvent entraîner des interruptions temporaires, qui
          seront limitées autant que possible.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">6. Responsabilité</h2>
        <p className="text-muted-foreground leading-relaxed">
          GESchool ne saurait être tenue responsable des dommages indirects résultant de l'utilisation de la plateforme,
          notamment en cas de perte de données due à une négligence de l'utilisateur ou de l'établissement.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">7. Droit applicable</h2>
        <p className="text-muted-foreground leading-relaxed">
          Les présentes conditions sont soumises au droit congolais. Tout litige relatif à leur interprétation ou à leur
          exécution relève des juridictions compétentes de la République du Congo.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">8. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          Pour toute question relative aux présentes conditions, contactez-nous à{' '}
          <a href="mailto:info@geschool.cd" className="text-primary hover:underline">info@geschool.cd</a>.
        </p>
      </section>
    </article>
  );
}
