// Générateur du kit commercial GESchool (PDF + DOCX).
// Exécuter : pnpm sales-kit
// Sortie : public/sales-kit/*.pdf et *.docx
//
// PDF  -> @react-pdf/renderer (déjà utilisé par l'app)
// DOCX -> librairie docx (vrai format Word, éditables)
//
// Modèle économique :
//  - Le parent paie 2 000 F/élève à l'inscription + 1 500 F/élève/mois via la plateforme.
//  - Répartition inscription : école 1 000 / GESchool 500 / affilié 500.
//  - Répartition mensuelle : école 750 / GESchool 500 / affilié 250.
//  - Pas de pilote gratuit : la première année, l'école reçoit sa part dès l'inscription.
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
import ExcelJS from "exceljs";

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

function PdfHeader({ title }) {
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

function PdfBullets({ items }) {
  return (
    <PdfView>
      {items.map((it, i) => (
        <PdfView key={i} style={pdfStyles.bullet}>
          <PdfView style={pdfStyles.bulletDot} />
          <PdfText style={pdfStyles.bulletText}>{it}</PdfText>
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

        <PdfSection title="Votre école gagne, elle ne dépense pas">
          <PdfBullets
            items={[
              "C'est le parent qui paie : " + fmtF(2000) + " par élève à l'inscription, puis " + fmtF(1500) + " par élève et par mois, via la plateforme.",
              "L'école reçoit " + fmtF(1000) + " par élève à l'inscription, puis " + fmtF(750) + " par élève chaque mois : un vrai revenu supplémentaire.",
              "Vous gagnez deux fois : en productivité (tout est automatisé, plus rapide et efficace) et sur les paiements des parents.",
              "Votre école garde la majorité : " + fmtF(1000) + " + " + fmtF(750) + " sur chaque " + fmtF(3500) + " versé par un parent.",
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
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Grille tarifaire — Rentrée" />
        <PdfBadge>L'école gagne, elle ne dépense pas</PdfBadge>
        <PdfText style={pdfStyles.h1}>Grille tarifaire GESchool</PdfText>
        <PdfText style={pdfStyles.p}>
          C'est le parent qui paie via la plateforme. Chaque versement est automatiquement réparti entre l'école,
          GESchool et l'affilié : votre établissement reçoit la majorité, sans aucune dépense.
        </PdfText>

        <PdfSection title="Répartition des frais payés par les parents">
          <PdfTable
            headers={["Frais", "Payé par le parent", "École", "GESchool", "Affilié"]}
            rows={[
              ["Inscription (1ère année, une seule fois)", fmtF(2000), fmtF(1000), fmtF(500), fmtF(500)],
              ["Chaque mois, par élève", fmtF(1500), fmtF(750), fmtF(500), fmtF(250)],
              ["Sur une année complète", fmtF(20000), fmtF(10000), fmtF(6500), fmtF(3500)],
            ]}
          />
        </PdfSection>

        <PdfSection title="Ce que votre école reçoit (première année)">
          <PdfTable
            headers={["Effectif", "Inscription", "Revenu mensuel", "Revenu annuel"]}
            rows={[
              ["100 élèves", fmtF(100000), fmtF(75000), fmtF(1000000)],
              ["150 élèves", fmtF(150000), fmtF(112500), fmtF(1500000)],
              ["200 élèves", fmtF(200000), fmtF(150000), fmtF(2000000)],
              ["300 élèves", fmtF(300000), fmtF(225000), fmtF(3000000)],
              ["500 élèves", fmtF(500000), fmtF(375000), fmtF(5000000)],
            ]}
          />
        </PdfSection>

        <PdfSection title="Tout inclus dans le service">
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

        <PdfSection title="Comment ça se passe">
          <PdfBullets
            items={[
              "Réservez une démo de 20 minutes avec notre équipe.",
              "Nous activons votre espace, pré-rempli avec des données d'exemple.",
              "Vous démarrez à la rentrée : les parents paient via la plateforme et votre école reçoit sa part.",
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
          tant que l'établissement reste actif. L'école y gagne aussi : elle reçoit la majorité des paiements des
          parents.
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
              "La part de l'école est prioritaire : votre commission ne réduit jamais le revenu de l'établissement.",
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
            par l'Éditeur de ses documents légaux, à souscrire à un abonnement GESchool. Le service est financé par les
            frais payés par les parents via la plateforme, répartis comme suit par élève :
          </PdfText>
          <PdfBullets
            items={[
              `À l'inscription (une seule fois) : ${fmtF(2000)} · école ${fmtF(1000)} · GESchool ${fmtF(500)} · affilié ${fmtF(500)} ;`,
              `Chaque mois : ${fmtF(1500)} · école ${fmtF(750)} · GESchool ${fmtF(500)} · affilié ${fmtF(250)} ;`,
              "pour un effectif estimé de [____] élèves.",
            ]}
          />
        </PdfSection>

        <PdfSection title="Article 2 — Mise en service">
          <PdfText style={pdfStyles.p}>
            L'Établissement s'engage à mettre la plateforme en service à la rentrée académique [année]. Dès la mise en
            service, les frais sont perçus auprès des parents via la plateforme, et l'Établissement reçoit sa part sur
            chaque versement, à partir de la première inscription.
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

function ConventionAbonnementPdf() {
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Convention d'abonnement" />
        <PdfText style={pdfStyles.h1}>Convention d'abonnement — GESchool</PdfText>
        <PdfText style={pdfStyles.p}>
          Entre GESchool, plateforme de gestion scolaire à Brazzaville, République du Congo (ci-après l'« Éditeur »),
          et l'établissement [Raison sociale / Nom de l'école], [Adresse / Ville], représenté(e) par [Nom], [Fonction]
          (ci-après l'« Établissement »).
        </PdfText>

        <PdfSection title="Article 1 — Objet">
          <PdfText style={pdfStyles.p}>
            La présente convention fixe les conditions d'utilisation de la plateforme GESchool par l'Établissement.
            Les frais de service sont payés par les parents à travers la plateforme : l'Établissement en reçoit la
            majorité.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 2 — Durée">
          <PdfText style={pdfStyles.p}>
            La présente convention est conclue pour l'année académique [____] et se renouvelle par tacite reconduction,
            sauf dénonciation écrite au plus tard trente (30) jours avant la fin de l'année en cours.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 3 — Prestations de l'Éditeur">
          <PdfBullets
            items={[
              "Mise à disposition de la plateforme : notes, bulletins, présences, paiements, communication parents-enseignants et IA.",
              "Formation initiale (2 séances minimum) et assistance pendant toute la durée de l'abonnement.",
              "Sauvegarde et protection des données de l'Établissement.",
            ]}
          />
        </PdfSection>

        <PdfSection title="Article 4 — Tarifs et répartition">
          <PdfText style={pdfStyles.p}>
            Les frais de service sont payés par les parents via la plateforme : {fmtF(2000)} par élève à l'inscription
            (une seule fois) et {fmtF(1500)} par élève et par mois. Chaque versement est réparti ainsi, par élève :
          </PdfText>
          <PdfBullets
            items={[
              `Établissement : ${fmtF(1000)} à l'inscription, puis ${fmtF(750)} par mois.`,
              `GESchool : ${fmtF(500)} à l'inscription, puis ${fmtF(500)} par mois.`,
              `Affilié (le cas échéant) : ${fmtF(500)} à l'inscription, puis ${fmtF(250)} par mois.`,
            ]}
          />
        </PdfSection>

        <PdfSection title="Article 5 — Engagements de l'Établissement">
          <PdfBullets
            items={[
              "Désigner un référent qui suivra la formation et interagira avec l'Éditeur.",
              "Utiliser la plateforme conformément à sa destination et saisir des données exactes.",
              "Ne pas reproduire, modifier ni redistribuer le logiciel.",
              "Autoriser l'Éditeur à mentionner le nom et le logo de l'Établissement comme référence commerciale.",
            ]}
          />
        </PdfSection>

        <PdfSection title="Article 6 — Données">
          <PdfText style={pdfStyles.p}>
            L'Établissement conserve la propriété de ses données. L'Éditeur s'engage à la confidentialité et à la
            protection des données, conformément à la législation applicable.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 7 — Résiliation">
          <PdfText style={pdfStyles.p}>
            En cas de manquement grave et non réparé, chaque partie peut résilier la présente convention par préavis
            écrit de trente (30) jours.
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
        <PdfFooterRight extra="GESchool — Convention d'abonnement" />
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

        <PdfSection title="Le message à retenir">
          <PdfBullets
            items={[
              "L'école gagne en productivité : bulletins, présences et paiements automatisés, des journées entières gagnées.",
              "L'école gagne en revenus : c'est le parent qui paie " + fmtF(2000) + " à l'inscription + " + fmtF(1500) + " par élève et par mois ; elle reçoit " + fmtF(1000) + " par élève à l'inscription puis " + fmtF(750) + " par élève chaque mois.",
            ]}
          />
        </PdfSection>

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
            « Bonjour, je m'appelle [____]. Je viens présenter GESchool, la plateforme qui automatise les bulletins,
            les présences et le suivi des frais de scolarité — et qui permet à votre école de gagner des revenus
            supplémentaires. Auriez-vous 20 minutes cette semaine pour une démonstration ? »
          </PdfText>
        </PdfSection>

        <PdfSection title="3. La démo idéale en 20 minutes">
          <PdfBullets
            items={[
              "Minutes 0-5 — Questionnez la douleur : « Comment gérez-vous les bulletins aujourd'hui ? », « Combien de temps faut-il pour les générer ? », « Comment suivez-vous les retards de paiement des tranches ? ».",
              "Minutes 5-15 — Montrez précisément comment GESchool résout LA douleur identifiée (base pré-remplie obligatoire).",
              "Minutes 15-20 — Présentez le gain financier (" + fmtF(1000) + " + " + fmtF(750) + " par élève) et proposez la signature de la lettre d'intention ; fixez la mise en service à la rentrée.",
            ]}
          />
        </PdfSection>

        <PdfSection title="4. Objections — préparez vos réponses">
          <PdfBullets
            items={[
              "« C'est trop cher » — « Ce n'est pas l'école qui paie : ce sont les parents. Votre école reçoit " + fmtF(1000) + " par élève à l'inscription + " + fmtF(750) + " par élève et par mois. Vous ne dépensez rien, vous gagnez. »",
              "« On utilise déjà Excel » — « Excel ne génère pas les bulletins ni ne suit les impayés en temps réel. GESchool vous fait gagner des jours entiers. »",
              "« Comment c'est sécurisé ? » — « Données hébergées sur un cloud sécurisé et sauvegardé ; l'école garde la main sur ses accès. »",
              "« Pas le moment » — « Justement : la démo ne vous engage à rien, et commencer à la rentrée vous rendra plus efficace dès le premier trimestre. »",
            ]}
          />
        </PdfSection>

        <PdfSection title="5. Suivi & relances">
          <PdfBullets
            items={[
              "J+1 : merci + envoi de la fiche produit.",
              "J+3 : relance téléphonique.",
              "J+7 : proposition de signature (lettre d'intention ou convention d'abonnement).",
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
              "Convention d'abonnement vierge",
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

// ---- Facture / Proforma (PDF) -------------------------------------------------------
function FacturePdf() {
  const repartRows = [
    ["Inscription (une seule fois)", fmtF(2000), fmtF(1000), fmtF(500), fmtF(500)],
    ["Chaque mois", fmtF(1500), fmtF(750), fmtF(500), fmtF(250)],
    ["Sur 12 mois", fmtF(20000), fmtF(10000), fmtF(6500), fmtF(3500)],
  ];
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Facture / Proforma" />
        <PdfBadge>PROFORMA — avant récépissé</PdfBadge>
        <PdfText style={pdfStyles.h1}>Facture / Proforma GESchool</PdfText>
        <PdfText style={pdfStyles.p}>
          Document établi avant l'obtention des documents légaux de l'Éditeur : il confirme les montants sans valeur de
          facture officielle. Il sera remplacé par une facture définitive dès l'immatriculation de l'éditeur.
        </PdfText>

        <PdfView style={{ flexDirection: "row", marginTop: 6 }}>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: ORANGE, marginBottom: 2 }}>ÉDITEUR</PdfText>
            <PdfText style={{ fontSize: 9, color: DARK }}>GESchool — plateforme de gestion scolaire</PdfText>
            <PdfText style={{ fontSize: 8.5, color: MUTED }}>Brazzaville, République du Congo</PdfText>
            <PdfText style={{ fontSize: 8.5, color: MUTED }}>{EMAIL} · {SITE}</PdfText>
          </PdfView>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: ORANGE, marginBottom: 2 }}>FACTURE</PdfText>
            <PdfText style={{ fontSize: 9, color: DARK }}>N° : [____/____/20__]</PdfText>
            <PdfText style={{ fontSize: 8.5, color: MUTED }}>Date : [____/____/20__]</PdfText>
            <PdfText style={{ fontSize: 8.5, color: MUTED }}>Client : [École] · [Ville]</PdfText>
          </PdfView>
        </PdfView>

        <PdfSection title="Détail">
          <PdfTable
            headers={["Réf.", "Désignation", "Qté", "P.U.", "Montant"]}
            rows={[
              ["1", "Mise en service — 1ère année (une seule fois)", "[__] élèves", fmtF(2000), "___________"],
              ["2", "Abonnement mensuel", "[__] élèves", fmtF(1500), "___________"],
              ["", "TOTAL POUR LA PÉRIODE", "", "", "___________"],
            ]}
          />
        </PdfSection>

        <PdfSection title="Répartition par élève">
          <PdfTable headers={["Frais", "Payé par le parent", "École", "GESchool", "Affilié"]} rows={repartRows} />
        </PdfSection>

        <PdfSection title="Modalités de paiement">
          <PdfBullets
            items={[
              "Les frais sont payés par les parents via la plateforme, au fil des inscriptions puis chaque mois.",
              "L'établissement reçoit sa part sur chaque versement.",
              "Ce proforma n'engage aucun paiement avant la mise en service officielle.",
            ]}
          />
        </PdfSection>

        <PdfView style={{ flexDirection: "row", marginTop: 20 }}>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 24 }}>Pour l'école — cachet & signature</PdfText>
            <PdfText style={{ fontSize: 8.5, color: MUTED }}>[Date] — [Signature / cachet]</PdfText>
          </PdfView>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 24 }}>Pour GESchool</PdfText>
            <PdfText style={{ fontSize: 8.5, color: MUTED }}>[Date] — [Signature]</PdfText>
          </PdfView>
        </PdfView>
        <PdfFooterRight extra="GESchool — Facture / Proforma" />
      </Page>
    </PdfDocument>
  );
}

// ---- Convention partenariat / affilié (PDF) ------------------------------------------
function ConventionAffiliePdf() {
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Partenaire & affilié" />
        <PdfText style={pdfStyles.h1}>Convention de partenariat / affiliation — GESchool</PdfText>
        <PdfText style={pdfStyles.p}>
          Entre GESchool, plateforme de gestion scolaire à Brazzaville, République du Congo (ci-après l'« Éditeur »),
          et [Nom & prénom(s) de l'affilié], [pièce d'identité n°], [ville / quartier], [téléphone], [email]
          (ci-après l'« Affilié »).
        </PdfText>

        <PdfSection title="Article 1 — Objet">
          <PdfText style={pdfStyles.p}>
            L'Affilié recommande les établissements scolaires à l'Éditeur, qui leur propose la plateforme GESchool.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 2 — Commission">
          <PdfText style={pdfStyles.p}>L'Affilié reçoit, par élève actif dans un établissement qu'il a recommandé :</PdfText>
          <PdfBullets
            items={[
              `${fmtF(500)} par élève à l'inscription (une seule fois) ;`,
              `${fmtF(250)} par élève, chaque mois, tant que l'établissement reste actif.`,
            ]}
          />
          <PdfText style={pdfStyles.p}>
            La commission est calculée sur l'effectif réellement actif et payant. Un établissement ne peut être
            rattaché qu'à un seul affilié.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 3 — Durée">
          <PdfText style={pdfStyles.p}>
            La présente convention est conclue pour une durée de 12 mois, renouvelable par tacite reconduction.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 4 — Obligations de l'Affilié">
          <PdfBullets
            items={[
              "Présenter GESchool de manière loyale et exacte, sans promesse mensongère.",
              "Ne pas se présenter comme un agent ou représentant officiel de l'Éditeur.",
              "Ne pas engager l'Éditeur sans autorisation écrite.",
              "Transmettre les coordonnées des établissements recommandés pour leur inscription.",
            ]}
          />
        </PdfSection>

        <PdfSection title="Article 5 — Paiement de la commission">
          <PdfText style={pdfStyles.p}>
            La commission due est versée chaque mois, par virement ou mobile money, sur la base d'un relevé des
            établissements et effectifs actifs fourni par l'Éditeur.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 6 — Suivi">
          <PdfText style={pdfStyles.p}>
            L'Affilié peut suivre les établissements qu'il a recommandés et l'effectif comptabilisé.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 7 — Résiliation">
          <PdfText style={pdfStyles.p}>
            Chaque partie peut résilier la présente convention par préavis écrit de trente (30) jours. Les commissions
            dues jusqu'à la date de fin restent payables.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 8 — Confidentialité et limites">
          <PdfText style={pdfStyles.p}>
            La commission est personnelle et non cessible. L'Affilié s'engage à ne pas divulguer les informations
            commerciales et tarifaires internes de l'Éditeur.
          </PdfText>
        </PdfSection>

        <PdfSection title="Article 9 — Droit applicable">
          <PdfText style={pdfStyles.p}>
            La présente convention est régie par le droit de la République du Congo. Tout litige relève des juridictions
            compétentes de Brazzaville.
          </PdfText>
        </PdfSection>

        <PdfView style={{ flexDirection: "row", marginTop: 20 }}>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 16 }}>Pour l'Affilié</PdfText>
            {["Nom & prénom(s)", "Date", "Signature"].map((l, i) => (
              <PdfText key={i} style={{ fontSize: 8.5, color: MUTED, marginBottom: 14 }}>[{l}]</PdfText>
            ))}
          </PdfView>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 16 }}>Pour l'Éditeur GESchool</PdfText>
            {["Nom & prénom(s)", "Date", "Signature"].map((l, i) => (
              <PdfText key={i} style={{ fontSize: 8.5, color: MUTED, marginBottom: 14 }}>[{l}]</PdfText>
            ))}
          </PdfView>
        </PdfView>
        <PdfText style={{ ...pdfStyles.muted, marginTop: 12 }}>
          Fait à : [______] le [____/____/20__] — en deux exemplaires originaux.
        </PdfText>
        <PdfFooterRight extra="GESchool — Convention de partenariat" />
      </Page>
    </PdfDocument>
  );
}

// ---- Fiche de RDV démo (PDF) ----------------------------------------------------------
function RdvPdf() {
  const top = (label, value) => (
    <PdfView style={{ marginBottom: 4 }}>
      <PdfText style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: MUTED }}>{label}</PdfText>
      <PdfText style={{ fontSize: 9.5, color: DARK }}>{value}</PdfText>
    </PdfView>
  );
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Démo de 20 minutes" />
        <PdfBadge>À remplir pendant le rendez-vous</PdfBadge>
        <PdfText style={pdfStyles.h1}>Fiche de rendez-vous — Démonstration</PdfText>

        <PdfText style={{ ...pdfStyles.h2, marginBottom: 6, marginTop: 8 }}>L'établissement</PdfText>
        {top("École", "[Raison sociale] · [Ville / Quartier]")}
        {top("Interlocuteur", "[Promoteur / Directeur Général / Directeur des Études]")}
        {top("Contact", "Téléphone : [____] · Email : [____]")}
        {top("Taille", "Élèves [____] · Enseignants [____] · Classes [____]")}
        {top("Niveaux", "Maternelle  ☐   Primaire  ☐   Collège  ☐   Lycée  ☐")}

        <PdfSection title="Ce qui coince aujourd'hui (cocher)">
          <PdfBullets
            items={[
              "Bulletins et moyennes à la main / sur Excel.",
              "Retards de paiement des frais de scolarité non suivis.",
              "Absentéisme non mesuré.",
              "Communication parents-enseignants difficile.",
              "Aucun outil numérique.",
              "Autre : [______________]",
            ]}
          />
        </PdfSection>

        <PdfSection title="Questions à poser">
          <PdfBullets
            items={[
              "« Comment générez-vous les bulletins aujourd'hui ? »",
              "« Comment suivez-vous les paiements et les impayés ? »",
              "« Combien de temps cela prend-il ? »",
              "« Qui prend la décision d'adopter un logiciel ? »",
            ]}
          />
        </PdfSection>

        <PdfSection title="Gain financier à présenter">
          <PdfText style={pdfStyles.p}>
            Le parent paie {fmtF(2000)} à l'inscription + {fmtF(1500)} par élève et par mois via la plateforme.
            L'école reçoit {fmtF(1000)} par élève à l'inscription puis {fmtF(750)} par élève chaque mois.
          </PdfText>
        </PdfSection>

        <PdfSection title="Pendant la démo — réactions / points montrés">
          <PdfText style={{ ...pdfStyles.muted, marginTop: 4 }}>____________________________________________________</PdfText>
          <PdfText style={{ ...pdfStyles.muted, marginTop: 4 }}>____________________________________________________</PdfText>
          <PdfText style={{ ...pdfStyles.muted, marginTop: 4 }}>____________________________________________________</PdfText>
        </PdfSection>

        <PdfSection title="Prochaine étape (cocher)">
          <PdfBullets
            items={[
              "Lettre d'intention à signer.",
              "Convention d'abonnement à signer.",
              "À recontacter en priorité le [____].",
              "Pas intéressé — motivation : [______________]",
            ]}
          />
        </PdfSection>

        <PdfText style={{ ...pdfStyles.muted, marginTop: 16 }}>
          Commercial : [____] · Date : [____] · Relance : J+1 ☐  J+3 ☐  J+7 ☐
        </PdfText>
        <PdfFooterRight extra="GESchool — Fiche de rendez-vous" />
      </Page>
    </PdfDocument>
  );
}

// ---- Modèle de témoignage (PDF) ------------------------------------------------------
function TemoignagePdf() {
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Témoignage" />
        <PdfBadge>À faire signer par l'établissement</PdfBadge>
        <PdfText style={pdfStyles.h1}>Modèle de témoignage — GESchool</PdfText>

        <PdfSection title="L'établissement">
          <PdfTable
            headers={["Établissement", "Représentant", "Fonction", "Date"]}
            rows={[["[Raison sociale]", "[Nom]", "[Fonction]", "[____/____/20__]"]]}
          />
        </PdfSection>

        <PdfSection title="Témoignage écrit (5 à 8 phrases)">
          <PdfText style={{ ...pdfStyles.muted, marginTop: 4 }}>________________________________________________________________</PdfText>
          <PdfText style={{ ...pdfStyles.muted, marginTop: 4 }}>________________________________________________________________</PdfText>
          <PdfText style={{ ...pdfStyles.muted, marginTop: 4 }}>________________________________________________________________</PdfText>
          <PdfText style={{ ...pdfStyles.muted, marginTop: 4 }}>________________________________________________________________</PdfText>
        </PdfSection>

        <PdfSection title="Questions guides (pour préparer le témoignage)">
          <PdfBullets
            items={[
              "Quelle était votre principale difficulté avant GESchool ?",
              "Comment GESchool a-t-il amélioré votre quotidien ? Donnez un exemple concret.",
              "Combien de temps gagnez-vous pour les bulletins, les présences et les paiements ?",
              "Que pensez-vous du modèle « le parent paie via la plateforme, l'école reçoit sa part » ?",
              "Recommanderiez-vous GESchool à d'autres écoles ? Pourquoi ?",
            ]}
          />
        </PdfSection>

        <PdfSection title="Accroche courte (3-4 lignes)">
          <PdfText style={{ ...pdfStyles.muted, marginTop: 4 }}>________________________________________________________________</PdfText>
          <PdfText style={{ ...pdfStyles.muted, marginTop: 4 }}>________________________________________________________________</PdfText>
        </PdfSection>

        <PdfSection title="Consentement de diffusion">
          <PdfText style={pdfStyles.p}>
            L'établissement autorise GESchool à utiliser ce témoignage comme référence commerciale, avec :
          </PdfText>
          <PdfBullets
            items={[
              "Nom et logo de l'établissement :  OUI  ☐   NON  ☐",
              "Photo / vidéo :  OUI  ☐   NON  ☐",
              "Contact public (téléphone / email) :  OUI  ☐   NON  ☐",
            ]}
          />
        </PdfSection>

        <PdfView style={{ flexDirection: "row", marginTop: 16 }}>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 16 }}>Pour l'établissement</PdfText>
            <PdfText style={{ fontSize: 8.5, color: MUTED }}>[Date] — [Signature / cachet]</PdfText>
          </PdfView>
          <PdfView style={{ flex: 1 }}>
            <PdfText style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 16 }}>Pour GESchool</PdfText>
            <PdfText style={{ fontSize: 8.5, color: MUTED }}>[Date] — [Signature]</PdfText>
          </PdfView>
        </PdfView>
        <PdfFooterRight extra="GESchool — Modèle de témoignage" />
      </Page>
    </PdfDocument>
  );
}

// ---- Modèles de relance (PDF) --------------------------------------------------------
function RelancePdf() {
  const mail = (subject, lines) => (
    <PdfView style={{ backgroundColor: "#f8fafc", borderRadius: 6, padding: 10, marginBottom: 8 }}>
      <PdfText style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: ORANGE_DARK }}>Objet : {subject}</PdfText>
      {lines.map((l, i) => (
        <PdfText key={i} style={{ fontSize: 9, color: BODY, marginTop: 4 }}>{l}</PdfText>
      ))}
    </PdfView>
  );
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader title="Modèles de relance" />
        <PdfBadge>À envoyer après chaque rendez-vous</PdfBadge>
        <PdfText style={pdfStyles.h1}>Modèles email & SMS de relance</PdfText>

        <PdfSection title="Plan de suivi">
          <PdfBullets
            items={[
              "J+1 : merci et envoi de la fiche produit.",
              "J+3 : appel téléphonique de relance.",
              "J+7 : proposition de signature (lettre d'intention ou convention).",
              "J+15 puis toutes les 2 semaines : relance jusqu'à réponse formelle.",
            ]}
          />
        </PdfSection>

        <PdfSection title="Email J+1 — Merci & fiche produit">
          {mail(
            "Votre démo GESchool — merci [Prénom]",
            [
              "Bonjour [Prénom],",
              "Merci pour votre temps lors de notre rendez-vous sur GESchool.",
              "Comme convenu, voici la fiche produit en pièce jointe. N'oubliez pas : le parent paie 2 000 F à l'inscription + 1 500 F/mois par élève, et votre école reçoit 1 000 F par élève + 750 F chaque mois.",
              "Je reste à votre disposition pour toute question.",
              "Bien à vous, [Votre nom] — GESchool",
            ]
          )}
        </PdfSection>

        <PdfSection title="SMS J+3 — rappel d'appel">
          {mail(
            "(SMS)",
            [
              "Bonjour [Prénom], avez-vous pu discuter de GESchool ? GESchool automatise les bulletins et suit vos paiements, et l'école garde la majorité des frais payés par les parents. Pouvez-vous me donner 5 minutes aujourd'hui ? [Nom]",
            ]
          )}
        </PdfSection>

        <PdfSection title="Email J+7 — Proposition de signature">
          {mail(
            "GESchool — préparons la rentrée ensemble",
            [
              "Bonjour [Prénom],",
              "Pour mémoire, avec GESchool votre école gagne deux fois : en productivité et sur les paiements des parents (1 000 F + 750 F par élève).",
              "Nous proposons de signer la lettre d'intention (sans engagement de paiement) pour réserver la mise en service à la prochaine rentrée, avec la formation offerte.",
              "Souhaitez-vous qu'on vous joigne pour finaliser ?",
              "Bien à vous, [Votre nom] — GESchool",
            ]
          )}
        </PdfSection>

        <PdfSection title="Relance J+15 et au-delà">
          {mail(
            "GESchool — dernier point avant la rentrée",
            [
              "Bonjour [Prénom],",
              "Les inscriptions approchent : les écoles équipées de GESchool démarreront la rentrée avec des bulletins, des présences et des paiements déjà automatisés.",
              "Puis-je vous rappeler dans les prochains jours, ou préférez-vous planifier une seconde démo ?",
              "Cordialement, [Votre nom] — GESchool",
            ]
          )}
        </PdfSection>

        <PdfSection title="Conseils">
          <PdfBullets
            items={[
              "Personnalisez toujours le prénom et le nom de l'école.",
              "Rappelez LA douleur identifiée lors de la démo.",
              "Appelez au moins une fois avant d'envoyer un email.",
              "Terminez chaque message par une question et un rendez-vous précis.",
            ]}
          />
        </PdfSection>
        <PdfFooterRight extra="GESchool — Modèles de relance" />
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
    children: headers.map((h) => docxCell(h, { header: true, width: { size: 100 / headers.length, type: WidthType.PERCENTAGE } })),
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
      { t: "h2", text: "Votre école gagne, elle ne dépense pas" },
      { t: "bl", items: [
        "C'est le parent qui paie : " + fmtF(2000) + " par élève à l'inscription, puis " + fmtF(1500) + " par élève et par mois, via la plateforme.",
        "L'école reçoit " + fmtF(1000) + " par élève à l'inscription, puis " + fmtF(750) + " par élève chaque mois : un vrai revenu supplémentaire.",
        "Vous gagnez deux fois : en productivité (tout est automatisé, plus rapide et efficace) et sur les paiements des parents.",
        "Votre école garde la majorité : " + fmtF(1000) + " + " + fmtF(750) + " sur chaque " + fmtF(3500) + " versé par un parent.",
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
      { t: "p", text: "C'est le parent qui paie via la plateforme. Chaque versement est automatiquement réparti entre l'école, GESchool et l'affilié : votre établissement reçoit la majorité, sans aucune dépense. Aucun coût caché." },
      { t: "h2", text: "Répartition des frais payés par les parents" },
      { t: "table",
        headers: ["Frais", "Payé par le parent", "École", "GESchool", "Affilié"],
        rows: [
          ["Inscription (1ère année, une seule fois)", fmtF(2000), fmtF(1000), fmtF(500), fmtF(500)],
          ["Chaque mois, par élève", fmtF(1500), fmtF(750), fmtF(500), fmtF(250)],
          ["Sur une année complète", fmtF(20000), fmtF(10000), fmtF(6500), fmtF(3500)],
        ] },
      { t: "h2", text: "Ce que votre école reçoit (première année)" },
      { t: "table",
        headers: ["Effectif", "Inscription", "Revenu mensuel", "Revenu annuel"],
        rows: [
          ["100 élèves", fmtF(100000), fmtF(75000), fmtF(1000000)],
          ["150 élèves", fmtF(150000), fmtF(112500), fmtF(1500000)],
          ["200 élèves", fmtF(200000), fmtF(150000), fmtF(2000000)],
          ["300 élèves", fmtF(300000), fmtF(225000), fmtF(3000000)],
          ["500 élèves", fmtF(500000), fmtF(375000), fmtF(5000000)],
        ] },
      { t: "h2", text: "Tout est inclus dans le service" },
      { t: "bl", items: [
        "Notes, moyennes et bulletins automatiques — présences et absentéisme.",
        "Suivi des paiements et des impayés — communication parents-enseignants.",
        "Assistant IA et statistiques — formation initiale et support inclus.",
      ] },
      { t: "h2", text: "Comment ça se passe" },
      { t: "num", items: [
        "Réservez une démo de 20 minutes.",
        "Nous activons votre espace, pré-rempli avec des données d'exemple.",
        "Vous démarrez à la rentrée : les parents paient via la plateforme et votre école reçoit sa part.",
      ] },
    ],
  },
  {
    file: "03-programme-affilies-geschool.docx",
    title: "Partenaires & affiliés",
    blocks: [
      { t: "logo" },
      { t: "h1", text: "Le programme Partenaires & Affiliés GESchool" },
      { t: "p", text: "Recommandez GESchool à un établissement et percevez une commission sur chaque élève présenté, chaque mois, tant que l'établissement reste actif. L'école y gagne aussi : elle reçoit la majorité des paiements des parents." },
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
        "La part de l'école est prioritaire : votre commission ne réduit jamais le revenu de l'établissement.",
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
      { t: "p", text: "L'Établissement s'engage, sous réserve de la mise en service officielle de la plateforme et de l'obtention par l'Éditeur de ses documents légaux, à souscrire à un abonnement GESchool. Le service est financé par les frais payés par les parents via la plateforme, répartis comme suit par élève :" },
      { t: "bl", items: [
        `À l'inscription (une seule fois) : ${fmtF(2000)} · école ${fmtF(1000)} · GESchool ${fmtF(500)} · affilié ${fmtF(500)} ;`,
        `Chaque mois : ${fmtF(1500)} · école ${fmtF(750)} · GESchool ${fmtF(500)} · affilié ${fmtF(250)} ;`,
        "pour un effectif estimé de [____] élèves.",
      ] },
      { t: "h2", text: "Article 2 — Mise en service" },
      { t: "p", text: "L'Établissement s'engage à mettre la plateforme en service à la rentrée académique [année]. Dès la mise en service, les frais sont perçus auprès des parents via la plateforme, et l'Établissement reçoit sa part sur chaque versement, à partir de la première inscription." },
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
    file: "05-convention-abonnement-geschool.docx",
    title: "Convention d'abonnement",
    blocks: [
      { t: "logo" },
      { t: "h1", text: "Convention d'abonnement — GESchool" },
      { t: "p", text: "Entre GESchool, plateforme de gestion scolaire à Brazzaville, République du Congo (ci-après l'« Éditeur »), et l'établissement [Raison sociale / Nom de l'école], [Adresse / Ville], représenté(e) par [Nom], [Fonction] (ci-après l'« Établissement »)." },
      { t: "h2", text: "Article 1 — Objet" },
      { t: "p", text: "La présente convention fixe les conditions d'utilisation de la plateforme GESchool par l'Établissement. Les frais de service sont payés par les parents à travers la plateforme : l'Établissement en reçoit la majorité." },
      { t: "h2", text: "Article 2 — Durée" },
      { t: "p", text: "La présente convention est conclue pour l'année académique [____] et se renouvelle par tacite reconduction, sauf dénonciation écrite au plus tard trente (30) jours avant la fin de l'année en cours." },
      { t: "h2", text: "Article 3 — Prestations de l'Éditeur" },
      { t: "bl", items: [
        "Mise à disposition de la plateforme : notes, bulletins, présences, paiements, communication parents-enseignants et IA.",
        "Formation initiale (2 séances minimum) et assistance pendant toute la durée de l'abonnement.",
        "Sauvegarde et protection des données de l'Établissement.",
      ] },
      { t: "h2", text: "Article 4 — Tarifs et répartition" },
      { t: "p", text: "Les frais de service sont payés par les parents via la plateforme : " + fmtF(2000) + " par élève à l'inscription (une seule fois) et " + fmtF(1500) + " par élève et par mois. Chaque versement est réparti ainsi, par élève :" },
      { t: "bl", items: [
        "Établissement : " + fmtF(1000) + " à l'inscription, puis " + fmtF(750) + " par mois.",
        "GESchool : " + fmtF(500) + " à l'inscription, puis " + fmtF(500) + " par mois.",
        "Affilié (le cas échéant) : " + fmtF(500) + " à l'inscription, puis " + fmtF(250) + " par mois.",
      ] },
      { t: "h2", text: "Article 5 — Engagements de l'Établissement" },
      { t: "bl", items: [
        "Désigner un référent qui suivra la formation et interagira avec l'Éditeur.",
        "Utiliser la plateforme conformément à sa destination et saisir des données exactes.",
        "Ne pas reproduire, modifier ni redistribuer le logiciel.",
        "Autoriser l'Éditeur à mentionner le nom et le logo de l'Établissement comme référence commerciale.",
      ] },
      { t: "h2", text: "Article 6 — Données" },
      { t: "p", text: "L'Établissement conserve la propriété de ses données. L'Éditeur s'engage à la confidentialité et à la protection des données, conformément à la législation applicable." },
      { t: "h2", text: "Article 7 — Résiliation" },
      { t: "p", text: "En cas de manquement grave et non réparé, chaque partie peut résilier la présente convention par préavis écrit de trente (30) jours." },
      { t: "h2", text: "Article 8 — Droit applicable" },
      { t: "p", text: "La présente convention est régie par le droit de la République du Congo. Tout litige relève des juridictions compétentes de Brazzaville." },
      { t: "sig" },
      { t: "muted", text: "Fait à : [______] le [____/____/20__] — en deux exemplaires originaux.", italics: true },
    ],
  },
];

// ---- Guide de prospection (DOCX) ----------------------------------------------------
const DOCX_GUIDE = {
  file: "06-guide-prospection-geschool.docx",
  title: "Guide de prospection",
  blocks: [
    { t: "logo" },
    { t: "h1", text: "Guide de prospection GESchool" },
    { t: "h2", text: "Le message à retenir" },
    { t: "bl", items: [
      "L'école gagne en productivité : bulletins, présences et paiements automatisés, des journées entières gagnées.",
      "L'école gagne en revenus : c'est le parent qui paie " + fmtF(2000) + " à l'inscription + " + fmtF(1500) + " par élève et par mois ; elle reçoit " + fmtF(1000) + " par élève à l'inscription puis " + fmtF(750) + " par élève chaque mois.",
    ] },
    { t: "h2", text: "1. Qui contacter ?" },
    { t: "bl", items: [
      "Cible prioritaire : les écoles privées — circuits de décision courts.",
      "Interlocuteur clé : le Promoteur, le Directeur Général ou le Directeur des Études.",
      "Les secrétariats filtrent : utilisez une accroche courte pour décrocher un rendez-vous.",
    ] },
    { t: "h2", text: "2. Accroche de 30 secondes" },
    { t: "p", text: "« Bonjour, je m'appelle [____]. Je viens présenter GESchool, la plateforme qui automatise les bulletins, les présences et le suivi des frais de scolarité — et qui permet à votre école de gagner des revenus supplémentaires. Auriez-vous 20 minutes cette semaine pour une démonstration ? »" },
    { t: "h2", text: "3. La démo idéale en 20 minutes" },
    { t: "bl", items: [
      "Minutes 0-5 — Questionnez la douleur : « Comment gérez-vous les bulletins aujourd'hui ? », « Combien de temps pour les générer ? », « Comment suivez-vous les retards de paiement ? ».",
      "Minutes 5-15 — Montrez précisément comment GESchool résout LA douleur identifiée (base pré-remplie obligatoire).",
      "Minutes 15-20 — Présentez le gain financier (" + fmtF(1000) + " + " + fmtF(750) + " par élève) et proposez la signature de la lettre d'intention ; fixez la mise en service à la rentrée.",
    ] },
    { t: "h2", text: "4. Objections — préparez vos réponses" },
    { t: "bl", items: [
      "« C'est trop cher » — « Ce n'est pas l'école qui paie : ce sont les parents. Votre école reçoit " + fmtF(1000) + " par élève à l'inscription + " + fmtF(750) + " par élève et par mois. Vous ne dépensez rien, vous gagnez. »",
      "« On utilise déjà Excel » — « Excel ne génère pas les bulletins ni ne suit les impayés en temps réel. GESchool vous fait gagner des jours entiers. »",
      "« Comment c'est sécurisé ? » — « Données hébergées sur un cloud sécurisé et sauvegardé ; l'école garde la main sur ses accès. »",
      "« Pas le moment » — « Justement : la démo ne vous engage à rien, et commencer à la rentrée vous rendra plus efficace dès le premier trimestre. »",
    ] },
    { t: "h2", text: "5. Suivi & relances" },
    { t: "bl", items: [
      "J+1 : merci + envoi de la fiche produit.",
      "J+3 : relance téléphonique.",
      "J+7 : proposition de signature (lettre d'intention ou convention d'abonnement).",
      "Puis relance tous les 15 jours jusqu'à une réponse formelle.",
    ] },
    { t: "h2", text: "6. Kit à emporter (checklist)" },
    { t: "bl", items: [
      "Fiche produit imprimée (recto/verso)",
      "Grille tarifaire",
      "Lettre d'intention vierge",
      "Convention d'abonnement vierge",
      "Lien de démo + compte test préparé à l'avance",
      "Carnet de prospection (école, contact, statut)",
    ] },
  ],
};

// ---- Contenus DOCX supplémentaires (facture, partenariat, RDV, témoignage, relance) --
const DOCX_EXTRA = [
  {
    file: "07-facture-proforma-geschool.docx",
    title: "Facture / Proforma",
    blocks: [
      { t: "logo" },
      { t: "h1", text: "Facture / Proforma GESchool" },
      { t: "p", text: "PROFORMA — document établi avant l'obtention des documents légaux de l'Éditeur : il confirme les montants sans valeur de facture officielle. Il sera remplacé par une facture définitive dès l'immatriculation de l'éditeur." },
      { t: "p", text: "ÉDITEUR : GESchool — plateforme de gestion scolaire, Brazzaville, République du Congo · " + EMAIL + " · " + SITE },
      { t: "p", text: "FACTURE N° [____/____/20__] · Date : [____/____/20__] · Client : [École] · [Ville]" },
      { t: "h2", text: "Détail" },
      { t: "table",
        headers: ["Réf.", "Désignation", "Qté", "P.U.", "Montant"],
        rows: [
          ["1", "Mise en service — 1ère année (une seule fois)", "[__] élèves", fmtF(2000), "___________"],
          ["2", "Abonnement mensuel", "[__] élèves", fmtF(1500), "___________"],
          ["", "TOTAL POUR LA PÉRIODE", "", "", "___________"],
        ] },
      { t: "h2", text: "Répartition par élève" },
      { t: "table",
        headers: ["Frais", "Payé par le parent", "École", "GESchool", "Affilié"],
        rows: [
          ["Inscription (une seule fois)", fmtF(2000), fmtF(1000), fmtF(500), fmtF(500)],
          ["Chaque mois", fmtF(1500), fmtF(750), fmtF(500), fmtF(250)],
          ["Sur 12 mois", fmtF(20000), fmtF(10000), fmtF(6500), fmtF(3500)],
        ] },
      { t: "h2", text: "Modalités de paiement" },
      { t: "bl", items: [
        "Les frais sont payés par les parents via la plateforme, au fil des inscriptions puis chaque mois.",
        "L'établissement reçoit sa part sur chaque versement.",
        "Ce proforma n'engage aucun paiement avant la mise en service officielle.",
      ] },
      { t: "sig" },
    ],
  },
  {
    file: "08-convention-partenariat-affilie-geschool.docx",
    title: "Convention de partenariat",
    blocks: [
      { t: "logo" },
      { t: "h1", text: "Convention de partenariat / affiliation — GESchool" },
      { t: "p", text: "Entre GESchool, plateforme de gestion scolaire à Brazzaville, République du Congo (ci-après l'« Éditeur »), et [Nom & prénom(s) de l'affilié], [pièce d'identité n°], [ville / quartier], [téléphone], [email] (ci-après l'« Affilié »)." },
      { t: "h2", text: "Article 1 — Objet" },
      { t: "p", text: "L'Affilié recommande les établissements scolaires à l'Éditeur, qui leur propose la plateforme GESchool." },
      { t: "h2", text: "Article 2 — Commission" },
      { t: "p", text: "L'Affilié reçoit, par élève actif dans un établissement qu'il a recommandé :" },
      { t: "bl", items: [
        fmtF(500) + " par élève à l'inscription (une seule fois) ;",
        fmtF(250) + " par élève, chaque mois, tant que l'établissement reste actif.",
      ] },
      { t: "p", text: "La commission est calculée sur l'effectif réellement actif et payant. Un établissement ne peut être rattaché qu'à un seul affilié." },
      { t: "h2", text: "Article 3 — Durée" },
      { t: "p", text: "La présente convention est conclue pour une durée de 12 mois, renouvelable par tacite reconduction." },
      { t: "h2", text: "Article 4 — Obligations de l'Affilié" },
      { t: "bl", items: [
        "Présenter GESchool de manière loyale et exacte, sans promesse mensongère.",
        "Ne pas se présenter comme un agent ou représentant officiel de l'Éditeur.",
        "Ne pas engager l'Éditeur sans autorisation écrite.",
        "Transmettre les coordonnées des établissements recommandés pour leur inscription.",
      ] },
      { t: "h2", text: "Article 5 — Paiement de la commission" },
      { t: "p", text: "La commission due est versée chaque mois, par virement ou mobile money, sur la base d'un relevé des établissements et effectifs actifs fourni par l'Éditeur." },
      { t: "h2", text: "Article 6 — Suivi" },
      { t: "p", text: "L'Affilié peut suivre les établissements qu'il a recommandés et l'effectif comptabilisé." },
      { t: "h2", text: "Article 7 — Résiliation" },
      { t: "p", text: "Chaque partie peut résilier la présente convention par préavis écrit de trente (30) jours. Les commissions dues jusqu'à la date de fin restent payables." },
      { t: "h2", text: "Article 8 — Confidentialité et limites" },
      { t: "p", text: "La commission est personnelle et non cessible. L'Affilié s'engage à ne pas divulguer les informations commerciales et tarifaires internes de l'Éditeur." },
      { t: "h2", text: "Article 9 — Droit applicable" },
      { t: "p", text: "La présente convention est régie par le droit de la République du Congo. Tout litige relève des juridictions compétentes de Brazzaville." },
      { t: "sig" },
      { t: "muted", text: "Fait à : [______] le [____/____/20__] — en deux exemplaires originaux.", italics: true },
    ],
  },
  {
    file: "09-fiche-rdv-demo-geschool.docx",
    title: "Fiche de rendez-vous",
    blocks: [
      { t: "logo" },
      { t: "h1", text: "Fiche de rendez-vous — Démonstration GESchool" },
      { t: "h2", text: "L'établissement" },
      { t: "bl", items: [
        "École : [Raison sociale] · [Ville / Quartier]",
        "Interlocuteur : [Promoteur / Directeur Général / Directeur des Études]",
        "Contact : Téléphone [____] · Email [____]",
        "Taille : élèves [____] · enseignants [____] · classes [____]",
        "Niveaux : Maternelle ☐ · Primaire ☐ · Collège ☐ · Lycée ☐",
      ] },
      { t: "h2", text: "Ce qui coince aujourd'hui (cocher)" },
      { t: "bl", items: [
        "Bulletins et moyennes à la main / sur Excel.",
        "Retards de paiement des frais de scolarité non suivis.",
        "Absentéisme non mesuré.",
        "Communication parents-enseignants difficile.",
        "Aucun outil numérique.",
        "Autre : [______________]",
      ] },
      { t: "h2", text: "Questions à poser" },
      { t: "bl", items: [
        "« Comment générez-vous les bulletins aujourd'hui ? »",
        "« Comment suivez-vous les paiements et les impayés ? »",
        "« Combien de temps cela prend-il ? »",
        "« Qui prend la décision d'adopter un logiciel ? »",
      ] },
      { t: "h2", text: "Gain financier à présenter" },
      { t: "p", text: "Le parent paie " + fmtF(2000) + " à l'inscription + " + fmtF(1500) + " par élève et par mois via la plateforme. L'école reçoit " + fmtF(1000) + " par élève à l'inscription puis " + fmtF(750) + " par élève chaque mois." },
      { t: "h2", text: "Pendant la démo — réactions / points montrés" },
      { t: "bl", items: ["____________________________", "____________________________", "____________________________"] },
      { t: "h2", text: "Prochaine étape (cocher)" },
      { t: "bl", items: [
        "Lettre d'intention à signer.",
        "Convention d'abonnement à signer.",
        "À recontacter en priorité le [____].",
        "Pas intéressé — motivation : [______________]",
      ] },
      { t: "muted", text: "Commercial : [____] · Date : [____] · Relance : J+1 ☐ J+3 ☐ J+7 ☐", italics: true },
    ],
  },
  {
    file: "10-modele-temoignage-geschool.docx",
    title: "Modèle de témoignage",
    blocks: [
      { t: "logo" },
      { t: "h1", text: "Modèle de témoignage — GESchool" },
      { t: "h2", text: "L'établissement" },
      { t: "table",
        headers: ["Établissement", "Représentant", "Fonction", "Date"],
        rows: [["[Raison sociale]", "[Nom]", "[Fonction]", "[____/____/20__]"]] },
      { t: "h2", text: "Témoignage écrit (5 à 8 phrases)" },
      { t: "bl", items: ["________________________________", "________________________________", "________________________________", "________________________________"] },
      { t: "h2", text: "Questions guides" },
      { t: "bl", items: [
        "Quelle était votre principale difficulté avant GESchool ?",
        "Comment GESchool a-t-il amélioré votre quotidien ? Donnez un exemple concret.",
        "Combien de temps gagnez-vous pour les bulletins, les présences et les paiements ?",
        "Que pensez-vous du modèle « le parent paie via la plateforme, l'école reçoit sa part » ?",
        "Recommanderiez-vous GESchool à d'autres écoles ? Pourquoi ?",
      ] },
      { t: "h2", text: "Accroche courte (3-4 lignes)" },
      { t: "bl", items: ["________________________________", "________________________________"] },
      { t: "h2", text: "Consentement de diffusion" },
      { t: "bl", items: [
        "Nom et logo de l'établissement : OUI ☐ · NON ☐",
        "Photo / vidéo : OUI ☐ · NON ☐",
        "Contact public (téléphone / email) : OUI ☐ · NON ☐",
      ] },
      { t: "sig" },
    ],
  },
  {
    file: "12-modeles-relance-geschool.docx",
    title: "Modèles de relance",
    blocks: [
      { t: "logo" },
      { t: "h1", text: "Modèles email & SMS de relance" },
      { t: "h2", text: "Plan de suivi" },
      { t: "bl", items: [
        "J+1 : merci et envoi de la fiche produit.",
        "J+3 : appel téléphonique de relance.",
        "J+7 : proposition de signature (lettre d'intention ou convention).",
        "J+15 puis toutes les 2 semaines : relance jusqu'à réponse formelle.",
      ] },
      { t: "h2", text: "Email J+1 — Merci & fiche produit" },
      { t: "p", text: "Objet : Votre démo GESchool — merci [Prénom]", opts: { bold: true } },
      { t: "bl", items: [
        "Bonjour [Prénom],",
        "Merci pour votre temps lors de notre rendez-vous sur GESchool.",
        "Comme convenu, voici la fiche produit en pièce jointe. N'oubliez pas : le parent paie " + fmtF(2000) + " à l'inscription + " + fmtF(1500) + " /mois par élève, et votre école reçoit " + fmtF(1000) + " par élève + " + fmtF(750) + " chaque mois.",
        "Je reste à votre disposition pour toute question.",
        "Bien à vous, [Votre nom] — GESchool",
      ] },
      { t: "h2", text: "SMS J+3 — rappel d'appel" },
      { t: "p", text: "Bonjour [Prénom], avez-vous pu discuter de GESchool ? GESchool automatise les bulletins et suit vos paiements, et l'école garde la majorité des frais payés par les parents. Pouvez-vous me donner 5 minutes aujourd'hui ? [Nom]" },
      { t: "h2", text: "Email J+7 — Proposition de signature" },
      { t: "p", text: "Objet : GESchool — préparons la rentrée ensemble", opts: { bold: true } },
      { t: "bl", items: [
        "Bonjour [Prénom],",
        "Pour mémoire, avec GESchool votre école gagne deux fois : en productivité et sur les paiements des parents (" + fmtF(1000) + " + " + fmtF(750) + " par élève).",
        "Nous proposons de signer la lettre d'intention (sans engagement de paiement) pour réserver la mise en service à la prochaine rentrée, avec la formation offerte.",
        "Souhaitez-vous qu'on vous joigne pour finaliser ?",
        "Bien à vous, [Votre nom] — GESchool",
      ] },
      { t: "h2", text: "Relance J+15 et au-delà" },
      { t: "p", text: "Objet : GESchool — dernier point avant la rentrée", opts: { bold: true } },
      { t: "bl", items: [
        "Bonjour [Prénom],",
        "Les inscriptions approchent : les écoles équipées de GESchool démarreront la rentrée avec des bulletins, des présences et des paiements déjà automatisés.",
        "Puis-je vous rappeler dans les prochains jours, ou préférez-vous planifier une seconde démo ?",
        "Cordialement, [Votre nom] — GESchool",
      ] },
      { t: "h2", text: "Conseils" },
      { t: "bl", items: [
        "Personnalisez toujours le prénom et le nom de l'école.",
        "Rappelez LA douleur identifiée lors de la démo.",
        "Appelez au moins une fois avant d'envoyer un email.",
        "Terminez chaque message par une question et un rendez-vous précis.",
      ] },
    ],
  },
];

// ---- Tableur de suivi prospection (XLSX) ---------------------------------------------
async function makeXlsx() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GESchool";
  wb.title = "Suivi de prospection";

  const ws = wb.addWorksheet("Prospection");
  const headers = [
    "Date", "École", "Contact", "Fonction", "Téléphone", "Email", "Ville / Quartier", "Effectif élèves",
    "Douleur principale", "Statut", "Prochaine étape", "Date relance", "Notes", "Commercial / Affilié",
  ];
  ws.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "École", key: "ecole", width: 28 },
    { header: "Contact", key: "contact", width: 20 },
    { header: "Fonction", key: "fonction", width: 16 },
    { header: "Téléphone", key: "tel", width: 16 },
    { header: "Email", key: "email", width: 24 },
    { header: "Ville / Quartier", key: "ville", width: 18 },
    { header: "Effectif élèves", key: "effectif", width: 12 },
    { header: "Douleur principale", key: "douleur", width: 24 },
    { header: "Statut", key: "statut", width: 18 },
    { header: "Prochaine étape", key: "prochaine", width: 26 },
    { header: "Date relance", key: "dateRelance", width: 12 },
    { header: "Notes", key: "notes", width: 30 },
    { header: "Commercial / Affilié", key: "commercial", width: 18 },
  ];
  ws.addRow(["2026-08-17", "Lycée Exemple 1", "M. Jean Exemple", "Promoteur", "+242 ...", "jean@exemple.cm", "Pointe-Noire", 300, "Bulletins manuels", "RDV pris", "Démo le 24 août", "2026-08-24", "", "Votre nom"]);
  ws.addRow(["2026-08-17", "École Exemple 2", "Mme Marie Exemple", "Directrice", "+242 ...", "marie@exemple.cm", "Brazzaville", 150, "Impays non suivis", "LOI signée", "Convention d'abonnement", "2026-09-01", "Effectif confirmé", ""]);
  ws.addRow(["2026-08-17", "Collège Exemple 3", "M. Paul Exemple", "Directeur des études", "+242 ...", "paul@exemple.cm", "Brazzaville", 500, "Communication parents", "À recontacter", "Rappel J+3", "2026-08-20", "", ""]);
  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((c) => {
    c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF97316" } };
    c.alignment = { vertical: "middle", wrapText: true };
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: "N20" };

  const rel = wb.addWorksheet("Relances");
  rel.columns = [
    { header: "École", key: "ecole", width: 26 },
    { header: "J+1 merci", key: "j1", width: 14 },
    { header: "J+3 appel", key: "j3", width: 14 },
    { header: "J+7 proposition", key: "j7", width: 14 },
    { header: "J+15+", key: "j15", width: 14 },
    { header: "Réponse", key: "rep", width: 46 },
  ];
  rel.addRow(["Lycée Exemple 1", "OK", "", "", "", "Signe la LOI le 31/08"]);
  const relH = rel.getRow(1);
  relH.height = 24;
  relH.eachCell((c) => {
    c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF97316" } };
  });
  rel.views = [{ state: "frozen", ySplit: 1 }];

  const legend = wb.addWorksheet("Tarifs & Statuts");
  legend.columns = [
    { header: "Élément", key: "e", width: 34 },
    { header: "Valeur", key: "v", width: 56 },
  ];
  legend.addRows([
    ["Inscription (1 fois / élève)", "2 000 F → école 1 000 / GESchool 500 / affilié 500"],
    ["Mensuel (élève / mois)", "1 500 F → école 750 / GESchool 500 / affilié 250"],
    ["Revenu école / élève / an", "10 000 F"],
    ["Commission affilié / élève / an", "3 500 F"],
    ["Statuts possibles", "Nouveau / RDV pris / Démo faite / LOI signée / Convention signée / À recontacter / Refus"],
    ["Dates de relance", "J+1 / J+3 / J+7 / puis toutes les 2 semaines"],
  ]);
  const lgH = legend.getRow(1);
  lgH.height = 24;
  lgH.eachCell((c) => {
    c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF97316" } };
  });

  const buf = await wb.xlsx.writeBuffer();
  fs.writeFileSync(path.join(OUT_DIR, "11-suivi-prospection-geschool.xlsx"), Buffer.from(buf));
  console.log("OK XLSX  11-suivi-prospection-geschool.xlsx");
}

// ---- Génération ----------------------------------------------------------------------
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pdfs = [
    ["01-fiche-produit-geschool.pdf", OnePagerPdf()],
    ["02-grille-tarifaire-geschool.pdf", TarifsPdf()],
    ["03-programme-affilies-geschool.pdf", AffiliesPdf()],
    ["04-lettre-intention-geschool.pdf", LoiPdf()],
    ["05-convention-abonnement-geschool.pdf", ConventionAbonnementPdf()],
    ["06-guide-prospection-geschool.pdf", GuidePdf()],
    ["07-facture-proforma-geschool.pdf", FacturePdf()],
    ["08-convention-partenariat-affilie-geschool.pdf", ConventionAffiliePdf()],
    ["09-fiche-rdv-demo-geschool.pdf", RdvPdf()],
    ["10-modele-temoignage-geschool.pdf", TemoignagePdf()],
    ["12-modeles-relance-geschool.pdf", RelancePdf()],
  ];

  for (const [file, element] of pdfs) {
    await renderToFile(element, path.join(OUT_DIR, file));
    console.log("OK PDF  ", file);
  }

  const all = [...DOCX_DOCS, DOCX_GUIDE, ...DOCX_EXTRA];
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

  await makeXlsx();

  console.log(`\nKit généré dans public/sales-kit/ (${pdfs.length} PDF + ${all.length} DOCX + XLSX)`);
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