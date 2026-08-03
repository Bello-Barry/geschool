import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — GESchool',
  description: "Politique de confidentialité de GESchool : collecte, utilisation et protection des données personnelles.",
};

export default function ConfidentialitePage() {
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-heading">Politique de confidentialité</h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : août 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">1. Responsable du traitement</h2>
        <p className="text-muted-foreground leading-relaxed">
          Les données personnelles collectées dans le cadre de l'utilisation de GESchool sont traitées par GESchool
          SARL, à Brazzaville, République du Congo. Pour toute question relative à vos données, contactez-nous à{' '}
          <a href="mailto:info@geschool.cd" className="text-primary hover:underline">info@geschool.cd</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">2. Données collectées</h2>
        <p className="text-muted-foreground leading-relaxed">
          Nous collectons les données strictement nécessaires au fonctionnement du service : nom, prénom, adresse
          email, rôle au sein de l'établissement, ainsi que les données scolaires (notes, présences, paiements) saisies
          par l'établissement utilisateur. Aucune donnée de paiement bancaire n'est stockée par GESchool.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">3. Finalités du traitement</h2>
        <p className="text-muted-foreground leading-relaxed">
          Les données sont utilisées pour : fournir et améliorer le service, gérer les comptes utilisateurs, assurer la
          sécurité de la plateforme, et répondre aux demandes d'assistance. Nous ne vendons jamais vos données à des
          tiers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">4. Conservation des données</h2>
        <p className="text-muted-foreground leading-relaxed">
          Les données sont conservées pendant la durée de la relation contractuelle avec l'établissement, puis archivées
          conformément aux obligations légales en vigueur. Chaque établissement reste maître de ses données et peut en
          demander l'exportation ou la suppression à tout moment.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">5. Vos droits</h2>
        <p className="text-muted-foreground leading-relaxed">
          Vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données
          personnelles. Pour exercer ces droits, contactez-nous à l'adresse indiquée ci-dessus. Une réponse vous sera
          apportée dans les meilleurs délais.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold font-heading">6. Sécurité</h2>
        <p className="text-muted-foreground leading-relaxed">
          GESchool met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données
          contre tout accès non autorisé, altération ou divulgation : chiffrement des transmissions, contrôle d'accès
          par rôle et sauvegardes régulières.
        </p>
      </section>
    </article>
  );
}
