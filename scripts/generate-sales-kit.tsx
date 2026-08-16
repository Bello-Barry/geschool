// Générateur du kit commercial GESchool (PDF + DOCX).
// Exécuter : node scripts/generate-sales-kit.mjs
// Sortie : public/sales-kit/*.pdf et *.docx
//
// PDF  -> @react-pdf/renderer (déjà utilisé par l'app)
// DOCX -> librairie docx (vrai format Word, éditables)
import fs from "node:fs";
import path from "node:path";
import React from "react";
import {
  Document as PdfDocument,
  Page,
  Text as PdfText,
  View as PdfView,
  Image as PdfImage,
  StyleSheet,
  renderToFile,
} from "@react-pdf/renderer";
import {
  AlignmentType,
  BorderStyle,
  Document as DocxDocument,
  Footer,
  Header,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

const OUT_DIR = path.resolve("public", "sales-kit");
const LOGO_PATH = path.resolve("public", "icon1.png");

// ---- Asset : logo -----------------------------------------------------------------
const LOGO_B64 = fs.readFileSync(LOGO_PATH).toString("base64");
const LOGO_SRC = `data:image/png;base64,${LOGO_B64}`;

// Lecture largeur/hauteur depuis l'en-tête IHDR d'un PNG (si binaire).
function pngSize(buffer) {
  if (buffer.length < 24) return { width: 64, height: 64 };
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}
const LOGO_BUF = fs.readFileSync(LOGO_PATH);
const LOGO_SIZE = pngSize(LOGO_BUF);
const LOGO_ASPECT = LOGO_SIZE.height / LOGO_SIZE.width;

// ---- Couleurs / identité ----------------------------------------------------------
const ORANGE = "#f97316";
const ORANGE_DARK = "#c2410c";
const DARK = "#0f172a";
const BODY = "#334155";
const MUTED = "#64748b";
const LIGHT = "#fff7ed";
const LINE = "#e2e8f0";
const GOOD = "#059669";

const EMAIL = "info@geschool.cd";
const SITE = "geschool.vercel.app";
const TAGLINE = "Gérer. Apprendre. Réussir.";

const fmtInt = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtF = (n) => `${fmtInt(n)} FCFA`;

// ---- Helpers PDF -------------------------------------------------------------------
const pdfStyles = StyleSheet.create({
  page: { fontFamily: "Helvetica", padding: 36, fontSize: 10, color: BODY, lineHeight: 1.45 },
  logoRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  logoImg: { width: 34, height: 34 * LOGO_ASPECT },
  brandBlock: { marginLeft: 10 },
  brandName: { fontSize: 18, fontWeight: 700, color: DARK, fontFamily: "Helvetica-Bold" },
  brandTag: { fontSize: 9, color: ORANGE, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: LIGHT,
    color: ORANGE_DARK,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    fontSize: 8.5,
    marginBottom: 10,
    fontFamily: "Helvetica-Bold",
  },
  h1: { fontSize: 22, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 8, lineHeight: 1.25 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: ORANGE, marginTop: 16, marginBottom: 6, textTransform: "uppercase" },
  p: { fontSize: 10, color: BODY, marginBottom: 8 },
  muted: { fontSize: 8.5, color: MUTED },
  bullet: { flexDirection: "row", marginBottom: 5 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE, marginTop: 3, marginRight: 7 },
  bulletText: { fontSize: 10, color: BODY, flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5, marginTop: 4 },
  card: {
    width: "33%",
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  cardTop: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  cardTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 3 },
  cardText: { fontSize: 8, color: MUTED, lineHeight: 1.4 },
  divider: { height: 1, backgroundColor: LINE, marginVertical: 14 },
  ctaBox: {
    backgroundColor: DARK,
    borderRadius: 10,
    padding: 18,
    marginTop: 6,
  },
  ctaTitle: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#ffffff", marginBottom: 6 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
  },
});

function PdfHeader({ title, badge }) {
  return (
    <PdfView style={pdfStyles.logoRow}>
      <PdfImage src={LOGO_SRC} style={pdfStyles.logoImg} />
      <PdfView style={pdfStyles.brandBlock}>
        <PdfText style={pdfStyles.brandName}>GESchool</PdfText>
        <PdfText style={pdfStyles.brandTag}>{TAGLINE}</PdfText>
      </PdfView>
      <PdfView style={{ flex: 1 }} />
      <PdfText style={{ fontSize: 8, color: MUTED }}>{title}</PdfText>
    </PdfView>
  );
}

function PdfBullets({ items, size = "body" }) {
  return (
    <PdfView>
      {items.map((it, i) => (
        <PdfView key={i} style={pdfStyles.bullet}>
          <PdfView style={pdfStyles.bulletDot} />
          <PdfText style={size === "small" ? { ...pdfStyles.bulletText, fontSize: 9 } : pdfStyles.bulletText}>{it}</PdfText>
        </PdfView>
      ))}
    </PdfView>
  );
}

function PdfSection({ title, children }) {
  return (
    <PdfView>
      <PdfText style={pdfStyles.h2}>{title}</PdfText>
      {children}
    </PdfView>
  );
}

function PdfBadge({ children }) {
  return (
    <PdfView style={{ alignSelf: "flex-start", backgroundColor: LIGHT, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 10 }}>
      <PdfText style={{ color: ORANGE_DARK, fontSize: 8.5, fontFamily: "Helvetica-Bold" }}>{children}</PdfText>
    </PdfView>
  );
}

function PdfFooterRight({ extra = "" }) {
  return (
    <PdfView style={pdfStyles.footer} fixed>
      <PdfText style={{ fontSize: 7.5, color: MUTED }}>
        GESchool — {EMAIL} · {SITE}
      </PdfText>
      <PdfText style={{ fontSize: 7.5, color: MUTED }}>{extra}</PdfText>
    </PdfView>
  );
}

// Tableau simple (PDF)
function PdfTable({ headers, rows }) {
  return (
    <PdfView>
      <PdfView style={{ flexDirection: "row", backgroundColor: ORANGE }}>
        {headers.map((h, i) => (
          <PdfView key={i} style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 6 }}>
            <PdfText style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#ffffff" }}>{h}</PdfText>
          </PdfView>
        ))}
      </PdfView>
      {rows.map((r, i) => (
        <PdfView key={i} style={{ flexDirection: "row", backgroundColor: i % 2 ? "#ffffff" : "#f8fafc", borderBottomWidth: 1, borderBottomColor: LINE }}>
          {r.map((c, j) => (
            <PdfView key={j} style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 6 }}>
              <PdfText style={{ fontSize: 8.5, color: j === 0 ? DARK : BODY }}>{c}</PdfText>
            </PdfView>
          ))}
        </PdfView>
      ))}
    </PdfView>
  );
}

// ---- Documents PDF -----------------------------------------------------------------
function OnePagerPdf() {
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Fiche produit" />
        <PdfBadge>Plateforme N°1 au Congo-Brazzaville</PdfBadge>
        <PdfText style={pdfStyles.h1}>La gestion scolaire, enfin simple.</PdfText>
        <PdfText style={pdfStyles.p}>
          Notes, bulletins, présences, paiements, communication parents-enseignants et intelligence artificielle :
          tout votre établissement dans une seule plateforme, conçue pour le Congo.
        </PdfText>

        <PdfSection title="Le problème">
          <PdfBullets
            items={[
              "Bulletins et moyennes calculés à la main ou sur Excel : erreurs, temps perdu, retards de remise.",
              "Retards de paiement des frais de scolarité : aucun suivi fiable des tranches et des impayés.",
              "Communication parents-enseignants difficile : les informations se perdent dans les cahiers.",
            ]}
          />
        </PdfSection>

        <PdfSection title="La solution">
          <PdfText style={pdfStyles.p}>
            GESchool centralise et automatise la gestion quotidienne de votre établissement, du primaire au
            secondaire — tout est en temps réel, accessible depuis n'importe quel appareil.
          </PdfText>
        </PdfSection>

        <PdfSection title="Fonctionnalités clés">
          <PdfView style={pdfStyles.grid}>
            {[
              ["Gestion des Notes", "Saisie rapide, moyennes automatiques et bulletins générés en quelques clics."],
              ["Présences", "Appel en un clic, suivi en temps réel et rapports d'absentéisme."],
              ["Paiements", "Frais de scolarité, suivi des impayés et reçus automatiques."],
              ["Communication", "Messagerie intégrée parents, enseignants, administration. Fini les mots dans les cahiers."],
              ["Intelligence Artificielle", "Analyse des performances, prédiction des résultats et recommandations."],
              ["Rapports & Statistiques", "Tableaux de bord en temps réel et export PDF par classe et par matière."],
            ].map(([t, d], i) => (
              <PdfView key={i} style={pdfStyles.card}>
                <PdfView style={pdfStyles.cardTop}>
                  <PdfText style={{ fontSize: 10, color: ORANGE, fontFamily: "Helvetica-Bold" }}>{i + 1}</PdfText>
                </PdfView>
                <PdfText style={pdfStyles.cardTitle}>{t}</PdfText>
                <PdfText style={pdfStyles.cardText}>{d}</PdfText>
              </PdfView>
            ))}
          </PdfView>
        </PdfSection>

        <PdfView style={pdfStyles.divider} />

        <PdfSection title="Pourquoi adopter GESchool">
          <PdfBullets
            items={[
              "Gain de temps immédiat pour l'administration et les enseignants.",
              "Transparence totale pour les parents (notes, absences, paiements).",
              "Adapté au système congolais : moyennes, classements, appréciations, tranches.",
              "Formation et support inclus. Aucune compétence technique requise.",
            ]}
          />
        </PdfSection>

        <PdfSection title="Un coût minime par élève">
          <PdfBullets
            items={[
              `${fmtF(2000)} par élève à l'inscription (une seule fois).`,
              `${fmtF(1500)} par élève et par mois — motif de lieu, sans engagement caché.`,
              `Option annuelle tout inclus : ${fmtF(20000)} par élève.`,
              "Places d'établissements pilotes disponibles à tarif préférentiel.",
            ]}
          />
        </PdfSection>

        <PdfView style={pdfStyles.ctaBox}>
          <PdfText style={pdfStyles.ctaTitle}>Réservez une démo de 20 minutes</PdfText>
          <PdfText style={{ fontSize: 9, color: "#fde68a", marginBottom: 4 }}>
            Démonstration gratuite, sans engagement, directement dans votre école.
          </PdfText>
          <PdfText style={{ fontSize: 9, color: "#ffffff" }}>
            {EMAIL} · {SITE}
          </PdfText>
        </PdfView>
        <PdfFooterRight extra="GESchool — Fiche produit" />
      </Page>
    </PdfDocument>
  );
}

function TarifsPdf() {
  const baseRows = [
    ["Mise en service de la plateforme", fmtF(2000), "Une seule fois, à l'activation"],
    ["Abonnement mensuel", fmtF(1500), "Chaque mois"],
    ["Abonnement trimestriel", fmtF(4500), "Tous les 3 mois"],
    ["Abonnement annuel (12 mois + inscription)", fmtF(20000), "À la rentrée"],
  ];
  const simRows = [
    ["100 élèves", fmtF(200000), fmtF(150000), fmtF(2000000)],
    ["150 élèves", fmtF(300000), fmtF(225000), fmtF(3000000)],
    ["200 élèves", fmtF(400000), fmtF(300000), fmtF(4000000)],
    ["300 élèves", fmtF(600000), fmtF(450000), fmtF(6000000)],
    ["500 élèves", fmtF(1000000), fmtF(750000), fmtF(10000000)],
  ];
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Grille tarifaire — Rentrée" />
        <PdfBadge>Tarifs simples et transparents</PdfBadge>
        <PdfText style={pdfStyles.h1}>Grille tarifaire GESchool</PdfText>
        <PdfText style={pdfStyles.p}>
          Des tarifs calculés par élève, rien d'autre : vous payez en fonction de votre effectif réel. Aucun coût
          caché, aucune redevance cachée.
        </PdfText>

        <PdfSection title="Tarifs de base">
          <PdfTable
            headers={["Élément", "Prix", "Fréquence"]}
            rows={baseRows}
          />
        </PdfSection>

        <PdfSection title="Simulations selon la taille de l'école">
          <PdfTable headers={["Effectif", "Mise en service", "Abonnement mensuel", "Année complète"]} rows={simRows} />
        </PdfSection>

        <PdfSection title="Tout inclus dans l'abonnement">
          <PdfBullets
            items={[
              "Gestion des notes, moyennes et bulletins automatiques.",
              "Présences et rapports d'absentéisme.",
              "Suivi des paiements et des impayés.",
              "Communication parents-enseignants.",
              "Assistant IA et statistiques.",
              "Formation initiale + support pendant toute la durée de l'abonnement.",
            ]}
          />
        </PdfSection>

        <PdfSection title="Établissements pilotes">
          <PdfText style={pdfStyles.p}>
            2 à 3 établissements bénéficient d'une période pilote (1 à 3 mois) avec accès gratuit ou à tarif réduit, en
            échange de leurs retours d'expérience et d'un témoignage. Les places sont limitées.
          </PdfText>
        </PdfSection>

        <PdfSection title="Comment ça se passe">
          <PdfBullets
            items={[
              "Réservez une démo de 20 minutes avec notre équipe.",
              "Nous activons votre espace, pré-rempli avec des données d'exemple.",
              "Vous démarrez à la rentrée, avec la formation offerte.",
            ]}
          />
        </PdfSection>

        <PdfView style={pdfStyles.ctaBox}>
          <PdfText style={pdfStyles.ctaTitle}>Démo gratuite, sans engagement</PdfText>
          <PdfText style={{ fontSize: 9, color: "#ffffff" }}>
            {EMAIL} · {SITE}
          </PdfText>
        </PdfView>
        <PdfFooterRight extra="GESchool — Grille tarifaire" />
      </Page>
    </PdfDocument>
  );
}

function AffiliesPdf() {
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Partenaires & affiliés" />
        <PdfBadge>Gagnez en recommandant GESchool</PdfBadge>
        <PdfText style={pdfStyles.h1}>Le programme Partenaires & Affiliés</PdfText>
        <PdfText style={pdfStyles.p}>
          Recommandez GESchool à un établissement et percevez une commission sur chaque élève présenté, chaque mois,
          tant que l'établissement reste actif.
        </PdfText>

        <PdfSection title="Votre commission">
          <PdfTable
            headers={["Élément", "Par élève", "Exemple : école de 200 élèves"]}
            rows={[
              [`À l'inscription (une seule fois)`, fmtF(500), fmtF(100000)],
              ["Chaque mois, tant que l'école est active", fmtF(250), fmtF(50000) + " / mois"],
              ["Revenu sur 12 mois", fmtF(3500), fmtF(700000)],
            ]}
          />
        </PdfSection>

        <PdfSection title="Comment ça marche">
          <PdfBullets
            items={[
              "Vous recommandez GESchool à un établissement (parent, enseignant, promoteur, agent de terrain).",
              "L'établissement s'inscrit et son effectif est comptabilisé.",
              "Vous recevez votre commission à chaque inscription et chaque mois.",
            ]}
          />
        </PdfSection>

        <PdfSection title="Que gagneriez-vous selon la taille de l'école ?">
          <PdfTable
            headers={["École recommandée", "Effectif", "Votre revenu (an 1)"]}
            rows={[
              ["Petite école", "50 élèves", fmtF(175000)],
              ["École moyenne", "150 élèves", fmtF(525000)],
              ["Grande école", "300 élèves", fmtF(1050000)],
            ]}
          />
        </PdfSection>

        <PdfSection title="Conditions">
          <PdfBullets
            items={[
              "Commission calculée sur l'effectif réellement actif et payant.",
              "Paiement mensuel, tant que l'établissement reste abonné.",
              "Un simple contrat de partenariat formalise vos droits.",
              "Ouvert aux parents, enseignants, promoteurs, influenceurs et agents de terrain.",
              "Vous pouvez suivre les établissements que vous avez recommandés.",
            ]}
          />
        </PdfSection>

        <PdfView style={pdfStyles.ctaBox}>
          <PdfText style={pdfStyles.ctaTitle}>Rejoignez le programme</PdfText>
          <PdfText style={{ fontSize: 9, color: "#ffffff" }}>
            {EMAIL} · {SITE}
          </PdfText>
        </PdfView>
        <PdfFooterRight extra="GESchool — Partenaires & affiliés" />
      </Page>
    </PdfDocument>
  );
}

function LoiPdf() {
  const top = (label, value) => (
    <PdfView style={{ marginBottom: 4 }}>
      <PdfText style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: MUTED }}>{label}</PdfText>
      <PdfText style={{ fontSize: 10, color: DARK }}>{value}</PdfText>
    </PdfView>
  );
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Lettre d'intention" />
        <PdfText style={{ fontSize: 8.5, color: MUTED, marginBottom: 12 }}>Fait à : [______] le [____/____/20__]</PdfText>
        <PdfText style={pdfStyles.h1}>Lettre d'intention de souscription à la plateforme GESchool</PdfText>

        <PdfText style={{ ...pdfStyles.h2, marginBottom: 6, marginTop: 10 }}>Entre les parties</PdfText>
        {top("L'Éditeur", "GESchool — plateforme de gestion scolaire, Brazzaville, République du Congo. Contact : " + EMAIL + " — " + SITE)}
        {top("L'Établissement", "[Raison sociale / Nom de l'école] · [Adresse / Ville] · représenté(e) par [Nom], [Fonction]")}

        <PdfText style={pdfStyles.p}>
          L'Établissement s'intéresse à la plateforme GESchool et confirme par la présente son intention d'y souscrire
          pour la gestion scolaire : notes, bulletins, présences, paiements et communication avec les parents.
        </PdfText>

        <PdfSection title="Article 1 — Objet">
          <PdfText style={pdfStyles.p}>
            L'Établissement s'engage, sous réserve de la mise en service officielle de la plateforme et de l'obtention
            par l'Éditeur de ses documents légaux, à souscrire à un abonnement GESchool aux tarifs suivants :
          </PdfText>
          <PdfBullets
            items={[
              `Frais de mise en service : ${fmtF(2000)} par élève (une seule fois) ;`,
              `Abonnement mensuel : ${fmtF(1500)} par élève et par mois ;`,
              "pour un effectif estimé de [____] élèves.",
            ]}
          />
        </PdfSection>

        <PdfSection title="Article 2 — Période pilote">
          <PdfText style={pdfStyles.p}>
            L'Établissement s'engage à participer à une période de test pilote de [1 à 3 mois], durant laquelle il
            facilitera l'utilisation de la plateforme et partagera ses retours d'expérience avec l'Éditeur.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 3 — Validité">
          <PdfText style={pdfStyles.p}>
            La présente lettre d'intention est valable 90 (quatre-vingt-dix) jours à compter de sa signature. Passé ce
            délai, elle devient caduque sauf renouvellement écrit des parties.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 4 — Nature du document">
          <PdfText style={pdfStyles.p}>
            La présente lettre traduit une intention de contractualiser. Elle ne constitue ni une facture, ni une
            obligation de paiement, ni un engagement ferme d'achat. Elle sera suivie d'une convention d'abonnement
            définitive lors de la mise en service officielle de la plateforme.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 5 — Confidentialité">
          <PdfText style={pdfStyles.p}>
            Les informations contenues dans la présente lettre restent confidentielles entre les parties.
          </PdfText>
        </PdfSection>

        <PdfView style={{ flexDirection: "row", marginTop: 24 }}>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 16 }}>
              Pour l'Établissement
            </PdfText>
            {["Nom & prénom(s)", "Fonction", "Date", "Signature"].map((l, i) => (
              <PdfText key={i} style={{ fontSize: 8.5, color: MUTED, marginBottom: 14 }}>[{l}]</PdfText>
            ))}
          </PdfView>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 16 }}>
              Pour l'Éditeur GESchool
            </PdfText>
            {["Nom & prénom(s)", "Fonction", "Date", "Signature"].map((l, i) => (
              <PdfText key={i} style={{ fontSize: 8.5, color: MUTED, marginBottom: 14 }}>[{l}]</PdfText>
            ))}
          </PdfView>
        </PdfView>

        <PdfText style={{ ...pdfStyles.muted, marginTop: 16 }}>
          À remplir et à signer en deux exemplaires originaux.
        </PdfText>
        <PdfFooterRight extra="GESchool — Lettre d'intention" />
      </Page>
    </PdfDocument>
  );
}

function ConventionPdf() {
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Convention pilote" />
        <PdfText style={pdfStyles.h1}>Convention d'établissement pilote — GESchool</PdfText>
        <PdfText style={pdfStyles.p}>
          Entre GESchool, plateforme de gestion scolaire à Brazzaville, République du Congo (ci-après l'« Éditeur »),
          et l'établissement [Raison sociale / Nom de l'école], [Adresse / Ville], représenté(e) par [Nom], [Fonction]
          (ci-après l'« Établissement »).
        </PdfText>

        <PdfSection title="Article 1 — Objet">
          <PdfText style={pdfStyles.p}>
            La présente convention définit les conditions dans lesquelles l'Établissement test la plateforme GESchool
            en tant qu'établissement pilote, avant une éventuelle souscription définitive.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 2 — Période pilote">
          <PdfText style={pdfStyles.p}>
            La période pilote débute le [____/____/20__] pour une durée de [1 à 3 mois], renouvelable par accord écrit
            des parties.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 3 — Prestations de l'Éditeur">
          <PdfBullets
            items={[
              "Mise à disposition d'un espace GESchool pré-rempli avec des données de démonstration.",
              "Formation initiale (2 séances minimum) et assistance pendant toute la période pilote.",
              "Accès gratuit / à tarif préférentiel de [____] pendant la période pilote.",
              "Aucune facturation pendant la période pilote.",
            ]}
          />
        </PdfSection>

        <PdfSection title="Article 4 — Engagements de l'Établissement">
          <PdfBullets
            items={[
              "Désigner un référent qui suivra la formation et interagira avec l'Éditeur.",
              "Utiliser la plateforme dans un environnement réel ou simulé.",
              "Partager régulièrement ses retours d'expérience et participer aux points de suivi.",
              "Fournir un témoignage écrit et/ou vidéo à l'issue de la période pilote.",
              "Autoriser l'Éditeur à mentionner le nom et le logo de l'Établissement comme référence commerciale.",
              "Ne pas reproduire, modifier ni redistribuer le logiciel.",
            ]}
          />
        </PdfSection>

        <PdfSection title="Article 5 — Données">
          <PdfText style={pdfStyles.p}>
            L'Établissement conserve la propriété de ses données. Pendant la phase pilote, il est recommandé d'utiliser
            des données fictives ou de démonstration. L'Éditeur s'engage à la confidentialité.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 6 — Après la période pilote">
          <PdfText style={pdfStyles.p}>
            À l'issue de la période pilote, l'Établissement peut poursuivre avec un abonnement payant aux tarifs en
            vigueur (grille tarifaire jointe). Les données saisies pendant le pilote sont conservées.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 7 — Résiliation">
          <PdfText style={pdfStyles.p}>
            Chaque partie peut mettre fin à la présente convention par un préavis écrit de quinze (15) jours.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 8 — Droit applicable">
          <PdfText style={pdfStyles.p}>
            La présente convention est régie par le droit de la République du Congo. Tout litige relève des juridictions
            compétentes de Brazzaville.
          </PdfText>
        </PdfSection>

        <PdfView style={{ flexDirection: "row", marginTop: 20 }}>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 16 }}>
              Pour l'Établissement
            </PdfText>
            {["Nom & prénom(s)", "Fonction", "Date", "Signature"].map((l, i) => (
              <PdfText key={i} style={{ fontSize: 8.5, color: MUTED, marginBottom: 14 }}>[{l}]</PdfText>
            ))}
          </PdfView>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 16 }}>
              Pour l'Éditeur GESchool
            </PdfText>
            {["Nom & prénom(s)", "Fonction", "Date", "Signature"].map((l, i) => (
              <PdfText key={i} style={{ fontSize: 8.5, color: MUTED, marginBottom: 14 }}>[{l}]</PdfText>
            ))}
          </PdfView>
        </PdfView>
        <PdfText style={{ ...pdfStyles.muted, marginTop: 12 }}>
          Fait à : [______] le [____/____/20__] — en deux exemplaires originaux.
        </PdfText>
        <PdfFooterRight extra="GESchool — Convention pilote" />
      </Page>
    </PdfDocument>
  );
}

function GuidePdf() {
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Prospection terrain" />
        <PdfBadge>Kit de terrain</PdfBadge>
        <PdfText style={pdfStyles.h1}>Guide de prospection GESchool</PdfText>

        <PdfSection title="1. Qui contacter ?">
          <PdfBullets
            items={[
              "Cible prioritaire : les écoles privées — circuits de décision courts.",
              "Interlocuteur clé : le Promoteur, le Directeur Général ou le Directeur des Études.",
              "Les secrétariats filtrent : préparez une accroche courte pour décrocher un rendez-vous.",
            ]}
          />
        </PdfSection>

        <PdfSection title="2. Accroche de 30 secondes">
          <PdfText style={pdfStyles.p}>
            « Bonjour, je m'appelle [____]. Je viens présenter GESchool, la plateforme de gestion scolaire qui
            automatise les bulletins, les présences et le suivi des frais de scolarité. Auriez-vous 20 minutes cette
            semaine pour une démonstration ? »
          </PdfText>
        </PdfSection>

        <PdfSection title="3. La démo idéale en 20 minutes">
          <PdfBullets
            items={[
              "Minutes 0-5 — Questionnez la douleur : « Comment gérez-vous les bulletins aujourd'hui ? », « Combien de temps faut-il pour les générer ? », « Comment suivez-vous les retards de paiement des tranches ? ».",
              "Minutes 5-15 — Montrez précisément comment GESchool résout LA douleur identifiée (base pré-remplie obligatoire).",
              "Minutes 15-20 — Proposez : période pilote gratuite + signature d'une lettre d'intention, et fixez une date de relance.",
            ]}
          />
        </PdfSection>

        <PdfSection title="4. Objections — préparez vos réponses">
          <PdfBullets
            items={[
              "« C'est trop cher » — « Le coût est de " + fmtF(2000) + " par élève + " + fmtF(1500) + " par mois : moins d'1% de la scolarité annuelle. »",
              "« On utilise déjà Excel » — « Excel ne génère pas les bulletins ni ne suit les impayés en temps réel. GESchool vous fait gagner des jours entiers. »",
              "« Comment c'est sécurisé ? » — « Données hébergées sur un cloud sécurisé et sauvegardé ; l'école garde la main sur ses accès. »",
              "« Pas le moment » — « Justement : une période pilote gratuite ne vous engage à rien et vous prépare à la rentrée. »",
            ]}
          />
        </PdfSection>

        <PdfSection title="5. Suivi & relances">
          <PdfBullets
            items={[
              "J+1 : merci + envoi de la fiche produit.",
              "J+3 : relance téléphonique.",
              "J+7 : proposition de signature (lettre d'intention ou convention pilote).",
              "Puis relance tous les 15 jours jusqu'à une réponse formelle.",
            ]}
          />
        </PdfSection>

        <PdfView style={pdfStyles.divider} />

        <PdfSection title="6. Kit à emporter (checklist)">
          <PdfBullets
            items={[
              "Fiche produit imprimée (recto/verso)",
              "Grille tarifaire",
              "Lettre d'intention vierge",
              "Convention pilote vierge",
              "Lien de démo + compte test préparé à l'avance",
              "Carnet de prospection (école, contact, statut)",
            ]}
          />
        </PdfSection>

        <PdfView style={pdfStyles.ctaBox}>
          <PdfText style={pdfStyles.ctaTitle}>Chaque rendez-vous compte</PdfText>
          <PdfText style={{ fontSize: 9, color: "#ffffff" }}>
            Notez toujours : école, interlocuteur, douleur principale, prochaine étape, date de relance.
          </PdfText>
        </PdfView>
        <PdfFooterRight extra="GESchool — Guide de prospection" />
      </Page>
    </PdfDocument>
  );
}

// ---- Helpers DOCX -------------------------------------------------------------------
const BORDER = { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" };

function cellBorders() {
  return { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
}

function docxCell(text, { header = false, width = undefined, bold = false } = {}) {
  return new TableCell({
    width,
    verticalAlign: VerticalAlign.CENTER,
    shading: header ? { type: ShadingType.CLEAR, color: "FFFFFF", fill: "F97316" } : undefined,
    borders: cellBorders(),
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: header || bold,
            color: header ? "FFFFFF" : "1F2937",
            size: 19,
          }),
        ],
      }),
    ],
  });
}

function docxTable(headers, rows) {
  const width = { size: 100, type: WidthType.PERCENTAGE };
  const headerRow = new TableRow({
    children: headers.map((h, i) => docxCell(h, { header: true, width: { size: 100 / headers.length, type: WidthType.PERCENTAGE } })),
  });
  const bodyRows = rows.map(
    (r) =>
      new TableRow({
        children: r.map((c, i) =>
          docxCell(c, {
            bold: i === 0,
            width: { size: 100 / r.length, type: WidthType.PERCENTAGE },
          })
        ),
      })
  );
  return new Table({ width, rows: [headerRow, ...bodyRows] });
}

const P = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 140 },
    children: [
      new TextRun({
        text,
        size: opts.size ?? 21,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color ?? "374151",
      }),
    ],
  });

const H1 = (text) => new Paragraph({ spacing: { before: 240, after: 140 }, children: [new TextRun({ text, size: 34, bold: true, color: "0F172A" })] });
const H2 = (text) => new Paragraph({ spacing: { before: 320, after: 100 }, children: [new TextRun({ text, size: 24, bold: true, color: "F97316" })] });
const GAP = (n = 120) => new Paragraph({ spacing: { after: n }, children: [new TextRun({ text: "", size: 2 })] });

function bullets(items, numbered = false) {
  return items.map((it, i) =>
    new Paragraph({
      bullet: numbered ? undefined : { level: 0 },
      spacing: { after: 80 },
      children: [
        ...(numbered ? [new TextRun({ text: `${i + 1}. `, bold: true, color: "F97316", size: 21 })] : []),
        new TextRun({ text: it, size: 21, color: "374151" }),
      ],
    })
  );
}

function sigBlocks() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          ["Pour l'Établissement", "Pour l'Éditeur GESchool"].map((t) =>
            new TableCell({
              borders: cellBorders(),
              children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 21 })] })],
            })
          ),
        ],
      }),
    ],
  });
}

function logoHeader() {
  const h = Math.round(56 * LOGO_ASPECT);
  const w = 56;
  return new Paragraph({
    spacing: { after: 200 },
    children: [
      new ImageRun({
        data: LOGO_BUF,
        transformation: { width: Math.round(w), height: Math.round(h) },
      }),
      new TextRun({ text: "   GESchool — " + TAGLINE, size: 26, bold: true, color: "0F172A" }),
    ],
  });
}

// ---- Contenus DOCX ------------------------------------------------------------------
const DOCX_DOCS = [
  {
    file: "01-fiche-produit-geschool.docx",
    title: "Fiche produit",
    blocks: [
      { t: "logo" },
      { t: "h1", text: "La gestion scolaire, enfin simple." },
      { t: "p", text: "Notes, bulletins, présences, paiements, communication parents-enseignants et intelligence artificielle : tout votre établissement dans une seule plateforme, conçue pour le Congo." },
      { t: "h2", text: "Le problème" },
      { t: "bl", items: [
        "Bulletins et moyennes calculés à la main ou sur Excel : erreurs, temps perdu, retards de remise.",
        "Retards de paiement des frais de scolarité : aucun suivi fiable des tranches et des impayés.",
        "Communication parents-enseignants difficile : les informations se perdent dans les cahiers.",
      ] },
      { t: "h2", text: "La solution" },
      { t: "p", text: "GESchool centralise et automatise la gestion quotidienne de votre établissement, du primaire au secondaire — tout est en temps réel et accessible depuis n'importe quel appareil." },
      { t: "h2", text: "Fonctionnalités clés" },
      { t: "bl", items: [
        "Gestion des Notes : saisie rapide, moyennes automatiques, bulletins générés en quelques clics.",
        "Présences : appel en un clic, suivi en temps réel, rapports d'absentéisme.",
        "Paiements : frais de scolarité, suivi des impayés, reçus automatiques.",
        "Communication : messagerie intégrée parents, enseignants, administration.",
        "Intelligence Artificielle : analyse des performances et recommandations personnalisées.",
        "Rapports & Statistiques : tableaux de bord en temps réel, export PDF par classe et par matière.",
      ] },
      { t: "h2", text: "Un coût minime par élève" },
      { t: "bl", items: [
        `${fmtF(2000)} par élève à l'inscription (une seule fois).`,
        `${fmtF(1500)} par élève et par mois.`,
        `Option annuelle tout inclus : ${fmtF(20000)} par élève.`,
        "Places d'établissements pilotes disponibles à tarif préférentiel.",
      ] },
      { t: "p", text: `Réservez une démo de 20 minutes, gratuite et sans engagement : ${EMAIL} · ${SITE}`, opts: { bold: true } },
    ],
  },
  {
    file: "02-grille-tarifaire-geschool.docx",
    title: "Grille tarifaire",
    blocks: [
      { t: "logo" },
      { t: "h1", text: "Grille tarifaire GESchool — Rentrée" },
      { t: "p", text: "Des tarifs calculés par élève, rien d'autre : vous payez selon votre effectif réel. Aucun coût caché." },
      { t: "h2", text: "Tarifs de base" },
      { t: "table",
        headers: ["Élément", "Prix", "Fréquence"],
        rows: [
          ["Mise en service de la plateforme", fmtF(2000), "Une seule fois, à l'activation"],
          ["Abonnement mensuel", fmtF(1500), "Chaque mois"],
          ["Abonnement trimestriel", fmtF(4500), "Tous les 3 mois"],
          ["Abonnement annuel (12 mois + inscription)", fmtF(20000), "À la rentrée"],
        ] },
      { t: "h2", text: "Simulations selon la taille de l'école" },
      { t: "table",
        headers: ["Effectif", "Mise en service", "Abonnement mensuel", "Année complète"],
        rows: [
          ["100 élèves", fmtF(200000), fmtF(150000), fmtF(2000000)],
          ["150 élèves", fmtF(300000), fmtF(225000), fmtF(3000000)],
          ["200 élèves", fmtF(400000), fmtF(300000), fmtF(4000000)],
          ["300 élèves", fmtF(600000), fmtF(450000), fmtF(6000000)],
          ["500 élèves", fmtF(1000000), fmtF(750000), fmtF(10000000)],
        ] },
      { t: "h2", text: "Tout est inclus dans l'abonnement" },
      { t: "bl", items: [
        "Notes, moyennes et bulletins automatiques — présences et absentéisme.",
        "Suivi des paiements et des impayés — communication parents-enseignants.",
        "Assistant IA et statistiques — formation initiale et support inclus.",
      ] },
      { t: "h2", text: "Établissements pilotes" },
      { t: "p", text: "2 à 3 établissements bénéficient d'une période pilote (1 à 3 mois) gratuite ou à tarif réduit, en échange de leurs retours d'expérience et d'un témoignage. Places limitées." },
      { t: "h2", text: "Comment ça se passe" },
      { t: "num", items: [
        "Réservez une démo de 20 minutes.",
        "Nous activons votre espace, pré-rempli avec des données d'exemple.",
        "Vous démarrez à la rentrée, avec la formation offerte.",
      ] },
    ],
  },
  {
    file: "03-programme-affilies-geschool.docx",
    title: "Partenaires & affiliés",
    blocks: [
      { t: "logo" },
      { t: "h1", text: "Le programme Partenaires & Affiliés GESchool" },
      { t: "p", text: "Recommandez GESchool à un établissement et percevez une commission sur chaque élève présenté, chaque mois, tant que l'établissement reste actif." },
      { t: "h2", text: "Votre commission" },
      { t: "table",
        headers: ["Élément", "Par élève", "Exemple : école de 200 élèves"],
        rows: [
          ["À l'inscription (une seule fois)", fmtF(500), fmtF(100000)],
          ["Chaque mois, tant que l'école est active", fmtF(250), fmtF(50000) + " / mois"],
          ["Revenu sur 12 mois", fmtF(3500), fmtF(700000)],
        ] },
      { t: "h2", text: "Comment ça marche" },
      { t: "num", items: [
        "Vous recommandez GESchool à un établissement.",
        "L'établissement s'inscrit et son effectif est comptabilisé.",
        "Vous percevez votre commission à chaque inscription et chaque mois.",
      ] },
      { t: "h2", text: "Votre revenu selon la taille de l'école (an 1)" },
      { t: "table",
        headers: ["École recommandée", "Effectif", "Votre revenu"],
        rows: [
          ["Petite école", "50 élèves", fmtF(175000)],
          ["École moyenne", "150 élèves", fmtF(525000)],
          ["Grande école", "300 élèves", fmtF(1050000)],
        ] },
      { t: "h2", text: "Conditions" },
      { t: "bl", items: [
        "Commission calculée sur l'effectif réellement actif et payant.",
        "Paiement mensuel tant que l'établissement reste abonné.",
        "Contrat de partenariat simple pour sécuriser vos droits.",
        "Ouvert aux parents, enseignants, promoteurs, influenceurs et agents de terrain.",
      ] },
      { t: "p", text: `Rejoignez le programme : ${EMAIL} · ${SITE}`, opts: { bold: true } },
    ],
  },
  {
    file: "04-lettre-intention-geschool.docx",
    title: "Lettre d'intention",
    blocks: [
      { t: "logo" },
      { t: "p", text: "Fait à : [______] le [____/____/20__]", opts: { italics: true } },
      { t: "h1", text: "Lettre d'intention de souscription à la plateforme GESchool" },
      { t: "h2", text: "Entre les parties" },
      { t: "p", text: "L'Éditeur : GESchool — plateforme de gestion scolaire, Brazzaville, République du Congo. Contact : " + EMAIL + " — " + SITE },
      { t: "p", text: "L'Établissement : [Raison sociale / Nom de l'école] · [Adresse / Ville] · représenté(e) par [Nom], [Fonction]" },
      { t: "p", text: "L'Établissement s'intéresse à la plateforme GESchool et confirme par la présente son intention d'y souscrire pour la gestion scolaire : notes, bulletins, présences, paiements et communication avec les parents." },
      { t: "h2", text: "Article 1 — Objet" },
      { t: "p", text: "L'Établissement s'engage, sous réserve de la mise en service officielle de la plateforme et de l'obtention par l'Éditeur de ses documents légaux, à souscrire à un abonnement GESchool aux tarifs suivants :" },
      { t: "bl", items: [
        `Frais de mise en service : ${fmtF(2000)} par élève (une seule fois) ;`,
        `Abonnement mensuel : ${fmtF(1500)} par élève et par mois ;`,
        "pour un effectif estimé de [____] élèves.",
      ] },
      { t: "h2", text: "Article 2 — Période pilote" },
      { t: "p", text: "L'Établissement s'engage à participer à une période de test pilote de [1 à 3 mois], durant laquelle il facilitera l'utilisation de la plateforme et partagera ses retours d'expérience avec l'Éditeur." },
      { t: "h2", text: "Article 3 — Validité" },
      { t: "p", text: "La présente lettre d'intention est valable 90 (quatre-vingt-dix) jours à compter de sa signature. Passé ce délai, elle devient caduque sauf renouvellement écrit des parties." },
      { t: "h2", text: "Article 4 — Nature du document" },
      { t: "p", text: "La présente lettre traduit une intention de contractualiser. Elle ne constitue ni une facture, ni une obligation de paiement, ni un engagement ferme d'achat. Elle sera suivie d'une convention d'abonnement définitive lors de la mise en service officielle de la plateforme." },
      { t: "h2", text: "Article 5 — Confidentialité" },
      { t: "p", text: "Les informations contenues dans la présente lettre restent confidentielles entre les parties." },
      { t: "sig" },
      { t: "muted", text: "À remplir et à signer en deux exemplaires originaux.", italics: true },
    ],
  },
  {
    file: "05-convention-etablissement-pilote-geschool.docx",
    title: "Convention pilote",
    blocks: [
      { t: "logo" },
      { t: "h1", text: "Convention d'établissement pilote — GESchool" },
      { t: "p", text: "Entre GESchool, plateforme de gestion scolaire à Brazzaville, République du Congo (ci-après l'« Éditeur »), et l'établissement [Raison sociale / Nom de l'école], [Adresse / Ville], représenté(e) par [Nom], [Fonction] (ci-après l'« Établissement »)." },
      { t: "h2", text: "Article 1 — Objet" },
      { t: "p", text: "La présente convention définit les conditions dans lesquelles l'Établissement teste la plateforme GESchool en tant qu'établissement pilote, avant une éventuelle souscription définitive." },
      { t: "h2", text: "Article 2 — Période pilote" },
      { t: "p", text: "La période pilote débute le [____/____/20__] pour une durée de [1 à 3 mois], renouvelable par accord écrit des parties." },
      { t: "h2", text: "Article 3 — Prestations de l'Éditeur" },
      { t: "bl", items: [
        "Mise à disposition d'un espace GESchool pré-rempli avec des données de démonstration.",
        "Formation initiale (2 séances minimum) et assistance pendant toute la période pilote.",
        "Accès gratuit / à tarif préférentiel de [____] pendant la période pilote.",
        "Aucune facturation pendant la période pilote.",
      ] },
      { t: "h2", text: "Article 4 — Engagements de l'Établissement" },
      { t: "bl", items: [
        "Désigner un référent qui suivra la formation et interagira avec l'Éditeur.",
        "Utiliser la plateforme dans un environnement réel ou simulé.",
        "Partager régulièrement ses retours d'expérience et participer aux points de suivi.",
        "Fournir un témoignage écrit et/ou vidéo à l'issue de la période pilote.",
        "Autoriser l'Éditeur à mentionner le nom et le logo de l'Établissement comme référence commerciale.",
        "Ne pas reproduire, modifier ni redistribuer le logiciel.",
      ] },
      { t: "h2", text: "Article 5 — Données" },
      { t: "p", text: "L'Établissement conserve la propriété de ses données. Pendant la phase pilote, il est recommandé d'utiliser des données fictives ou de démonstration. L'Éditeur s'engage à la confidentialité." },
      { t: "h2", text: "Article 6 — Après la période pilote" },
      { t: "p", text: "À l'issue de la période pilote, l'Établissement peut poursuivre avec un abonnement payant aux tarifs en vigueur (grille tarifaire jointe). Les données saisies pendant le pilote sont conservées." },
      { t: "h2", text: "Article 7 — Résiliation" },
      { t: "p", text: "Chaque partie peut mettre fin à la présente convention par un préavis écrit de quinze (15) jours." },
      { t: "h2", text: "Article 8 — Droit applicable" },
      { t: "p", text: "La présente convention est régie par le droit de la République du Congo. Tout litige relève des juridictions compétentes de Brazzaville." },
      { t: "sig" },
      { t: "muted", text: "Fait à : [______] le [____/____/20__] — en deux exemplaires originaux.", italics: true },
    ],
  },
];

// ---- Guides DOCX (2) pour le guide de prospection -------------------------------------
const DOCX_GUIDE = {
  file: "06-guide-prospection-geschool.docx",
  title: "Guide de prospection",
  blocks: [
    { t: "logo" },
    { t: "h1", text: "Guide de prospection GESchool" },
    { t: "h2", text: "1. Qui contacter ?" },
    { t: "bl", items: [
      "Cible prioritaire : les écoles privées — circuits de décision courts.",
      "Interlocuteur clé : le Promoteur, le Directeur Général ou le Directeur des Études.",
      "Les secrétariats filtrent : utilisez une accroche courte pour décrocher un rendez-vous.",
    ] },
    { t: "h2", text: "2. Accroche de 30 secondes" },
    { t: "p", text: "« Bonjour, je m'appelle [____]. Je viens présenter GESchool, la plateforme de gestion scolaire qui automatise les bulletins, les présences et le suivi des frais de scolarité. Auriez-vous 20 minutes cette semaine pour une démonstration ? »" },
    { t: "h2", text: "3. La démo idéale en 20 minutes" },
    { t: "bl", items: [
      "Minutes 0-5 — Questionnez la douleur : « Comment gérez-vous les bulletins aujourd'hui ? », « Combien de temps pour les générer ? », « Comment suivez-vous les retards de paiement ? ».",
      "Minutes 5-15 — Montrez précisément comment GESchool résout LA douleur identifiée (base pré-remplie obligatoire).",
      "Minutes 15-20 — Proposez : période pilote gratuite + lettre d'intention, et fixez une date de relance.",
    ] },
    { t: "h2", text: "4. Objections — préparez vos réponses" },
    { t: "bl", items: [
      "« C'est trop cher » — « Le coût est de " + fmtF(2000) + " par élève + " + fmtF(1500) + " par mois : moins d'1% de la scolarité annuelle. »",
      "« On utilise déjà Excel » — « Excel ne génère pas les bulletins ni ne suit les impayés en temps réel. GESchool vous fait gagner des jours entiers. »",
      "« Comment c'est sécurisé ? » — « Données hébergées sur un cloud sécurisé et sauvegardé ; l'école garde la main sur ses accès. »",
      "« Pas le moment » — « Justement : une période pilote gratuite ne vous engage à rien et vous prépare à la rentrée. »",
    ] },
    { t: "h2", text: "5. Suivi & relances" },
    { t: "bl", items: [
      "J+1 : merci + envoi de la fiche produit.",
      "J+3 : relance téléphonique.",
      "J+7 : proposition de signature (lettre d'intention ou convention pilote).",
      "Puis relance tous les 15 jours jusqu'à une réponse formelle.",
    ] },
    { t: "h2", text: "6. Kit à emporter (checklist)" },
    { t: "bl", items: [
      "Fiche produit imprimée (recto/verso)",
      "Grille tarifaire",
      "Lettre d'intention vierge",
      "Convention pilote vierge",
      "Lien de démo + compte test préparé à l'avance",
      "Carnet de prospection (école, contact, statut)",
    ] },
  ],
};

// ---- Génération ----------------------------------------------------------------------
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pdfs = [
    ["01-fiche-produit-geschool.pdf", OnePagerPdf()],
    ["02-grille-tarifaire-geschool.pdf", TarifsPdf()],
    ["03-programme-affilies-geschool.pdf", AffiliesPdf()],
    ["04-lettre-intention-geschool.pdf", LoiPdf()],
    ["05-convention-etablissement-pilote-geschool.pdf", ConventionPdf()],
    ["06-guide-prospection-geschool.pdf", GuidePdf()],
  ];

  for (const [file, element] of pdfs) {
    await renderToFile(element, path.join(OUT_DIR, file));
    console.log("OK PDF  ", file);
  }

  const all = [...DOCX_DOCS, DOCX_GUIDE];
  for (const d of all) {
    const doc = new DocxDocument({
      styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
      creator: "GESchool",
      title: d.title,
      header: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new ImageRun({ data: LOGO_BUF, transformation: { width: 28, height: Math.round(28 * LOGO_ASPECT) } }),
                new TextRun({ text: "  GESchool — " + d.title, size: 18, color: "64748B", bold: true }),
              ],
            }),
          ],
        }),
      },
      footer: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `${EMAIL} · ${SITE} · Page `, size: 16, color: "64748B" }),
                new TextRun({ children: [PageNumber.CURRENT] }),
              ],
            }),
          ],
        }),
      },
      sections: [{ characteristics: { page: { size: { width: 11906, height: 16838 } } }, children: blocksToDocx(d.blocks) }],
    });
    const buf = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(OUT_DIR, d.file), buf);
    console.log("OK DOCX ", d.file);
  }

  console.log(`\nKit généré dans public/sales-kit/ (${pdfs.length} PDF + ${all.length} DOCX)`);
}

function blocksToDocx(blocks) {
  const children = [];
  for (const b of blocks) {
    switch (b.t) {
      case "logo":
        children.push(logoHeader());
        break;
      case "h1":
        children.push(H1(b.text));
        break;
      case "h2":
        children.push(H2(b.text));
        break;
      case "p":
        children.push(P(b.text, b.opts));
        break;
      case "bl":
        children.push(...bullets(b.items));
        break;
      case "num":
        children.push(...bullets(b.items, true));
        break;
      case "table":
        children.push(docxTable(b.headers, b.rows), GAP());
        break;
      case "sig":
        children.push(sigBlocks(), GAP());
        break;
      case "gap":
        children.push(GAP(b.n));
        break;
      case "muted":
        children.push(P(b.text, { size: 18, color: "64748B", italics: b.italics }));
        break;
      default:
        break;
    }
  }
  return children;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});