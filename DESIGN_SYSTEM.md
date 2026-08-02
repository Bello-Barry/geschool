# DESIGN_SYSTEM.md — GESchool

Document de référence du système de design (Chantier 19, Phase 0). **Toute nouvelle valeur visuelle doit venir d'ici** ; aucune valeur en dur (taille, couleur, rayon, espacement) ne doit être écrite directement dans un composant.

---

## 1. Identité visuelle

| Élément | Valeur | Token |
|---------|--------|-------|
| **Couleur principale (brand)** | Orange `#FF6600` = `hsl(24 100% 50%)` | `brand-500` / `--primary` |
| **Couleur secondaire / texte** | Marine `#1A1A2E` = `hsl(240 28% 14%)` | `marine-900` / `--foreground` |
| Police de titres | Outfit (via `next/font`) | `font-heading` |
| Police de corps | Inter (système en fallback) | `font-sans` |

Le couple orange/marine est la signature du produit : actions, liens et accents forts en orange ; texte, titres et fonds sombres en marine.

---

## 2. Palette

### 2.1 Orange brand (dérivé de `#FF6600`)

| Token | HSL | Usage |
|-------|-----|-------|
| `brand-50` | `24 96% 96%` | Fond très clair des accents orange |
| `brand-100` | `24 95% 92%` | Fond des badges/icônes accent |
| `brand-200` | `24 94% 84%` | Bordures accent claires |
| `brand-300` | `24 95% 72%` | — |
| `brand-400` | `24 96% 62%` | Survol du primaire |
| `brand-500` | `24 100% 50%` | **Primaire `#FF6600`** |
| `brand-600` | `22 100% 45%` | Primaire pressé |
| `brand-700` | `20 100% 38%` | Texte/lien sur fond clair |
| `brand-800` | `18 92% 32%` | — |
| `brand-900` | `16 85% 26%` | — |

### 2.2 Marine (dérivé de `#1A1A2E`)

| Token | HSL | Usage |
|-------|-----|-------|
| `marine-50` | `240 30% 97%` | Fond très clair |
| `marine-100` | `240 28% 93%` | Fond de section |
| `marine-200` | `240 26% 86%` | — |
| `marine-300` | `240 24% 74%` | — |
| `marine-400` | `240 22% 60%` | — |
| `marine-500` | `240 24% 46%` | — |
| `marine-600` | `240 26% 36%` | — |
| `marine-700` | `240 27% 26%` | — |
| `marine-800` | `240 28% 20%` | — |
| `marine-900` | `240 28% 14%` | **Texte principal `#1A1A2E`** |

### 2.3 Gris neutres chauds

| Token | HSL | Usage |
|-------|-----|-------|
| `neutral-50` | `40 20% 99%` | Fond de page |
| `neutral-100` | `40 18% 96%` | Fond discret (`--muted`) |
| `neutral-200` | `40 16% 92%` | Fond secondaire |
| `neutral-300` | `40 14% 86%` | Bordures (`--border`, `--input`) |
| `neutral-400` | `40 12% 74%` | Icônes désactivées |
| `neutral-500` | `220 10% 58%` | — |
| `neutral-600` | `220 12% 46%` | Texte secondaire (`--muted-foreground`) |
| `neutral-700` | `220 14% 34%` | — |
| `neutral-800` | `220 16% 24%` | — |
| `neutral-900` | `220 18% 16%` | — |

### 2.4 Sémantiques (adoucies, cohérentes avec orange/marine)

| Token | `-50` | `-100` | `-500` | `-700` | Usage |
|-------|-------|--------|--------|--------|-------|
| `success` (vert) | `150 60% 95%` | `150 55% 90%` | `150 60% 40%` | `150 70% 28%` | Payé, présent, confirmé |
| `warning` (jaune) | `38 90% 95%` | `38 88% 90%` | `38 92% 50%` | `34 88% 38%` | En attente, brouillon |
| `danger` (rouge) | `0 80% 96%` | `0 75% 91%` | `0 84% 60%` | `0 72% 44%` | Rejeté, absent, erreur |
| `info` (bleu) | `215 80% 96%` | `215 75% 92%` | `215 85% 55%` | `215 75% 40%` | Publié, information |

**Règle d'usage d'un badge/état** : fond = `-100`, texte = `-700` (ex. `bg-success-100 text-success-700`). Aucun autre gris/vert/rouge Tailwind.

---

## 3. Typographie

Échelle canonique **12 / 14 / 16 / 20 / 24 / 32 px** — rien en dehors.

| Classe | Taille | Line-height | Usage |
|--------|--------|-------------|-------|
| `text-xs` | 12px | 16px | Métadonnées, badges, pieds de tableau |
| `text-sm` | 14px | 20px | Corps secondaire, descriptions, tableaux |
| `text-base` | 16px | 24px | Corps principal, inputs |
| `text-lg` | 20px | 28px | Sous-titres de section, titres de carte |
| `text-xl` | 24px | 32px | Titres de page (avec `font-heading`) |
| `text-2xl` | 32px | 40px | Grands titres de page |

- Titres (`h1`–`h4`, `CardTitle`, en-têtes de page) : `font-heading` + `font-semibold/bold`.
- Corps : `font-sans`.
- **Interdit** : `text-[10px]`, `text-[11px]`, `text-[13px]`, etc. → utiliser `text-xs`/`text-sm`.

---

## 4. Espacement

Échelle sémantique **4 / 8 / 12 / 16 / 24 / 32 / 48 px**.

| Token | Valeur |
|-------|--------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 12px |
| `lg` | 16px |
| `xl` | 24px |
| `2xl` | 32px |
| `3xl` | 48px |

Usage : `gap-md`, `p-lg`, `mt-xl`, `space-y-2xl`… Les valeurs numériques Tailwind (`p-1`…`p-12`) restent valides et équivalentes. **Interdit** : `p-[13px]`, `gap-[22px]`, `m-[7px]`, etc.

---

## 5. Rayons de bordure

| Token | Valeur | Usage |
|-------|--------|-------|
| `rounded-sm` | 6px | Petits éléments (badges outline, checkbox) |
| `rounded-md` | 8px | **Boutons, inputs, selects, textarea** |
| `rounded-lg` | 12px | Cartes, dropdowns, popovers |
| `rounded-xl` | 16px | Modales, grands panneaux |
| `rounded-full` | 9999px | Pills, badges, avatars |

---

## 6. Ombres

| Token | Valeur | Usage |
|-------|--------|-------|
| `shadow-card` | `0 1px 3px rgba(26,26,46,0.08)` | Cartes au repos |
| `shadow-elevated` | `0 4px 12px rgba(26,26,46,0.12)` | Cartes survolées / éléments flottants |
| `shadow-modal` | `0 12px 32px rgba(26,26,46,0.20)` | Modales, sheets |
| `shadow-brand-glow` | `0 4px 14px rgba(255,102,0,0.35)` | Bouton primaire |

---

## 7. Composants partagés (Phase 1)

Refonte unique avec ces tokens, puis application partout :

1. **Button** — variants `default`(brand), `secondary`, `outline`, `destructive`, `ghost`, `link` ; tailles `sm`/`default`/`lg`/`icon`. **Zone tactile ≥ 44px sur mobile** (hauteur min `h-11` sur mobile).
2. **Input / Select / Textarea / DatePicker** — `rounded-md`, bordure `--input`, focus `ring-brand-500`, label + message d'erreur cohérents.
3. **Card** — `rounded-lg shadow-card`, header/titre/description/contenu normalisés.
4. **Table → cartes empilées** sur mobile (pattern Chantier 10), tableau plein sur desktop.
5. **`<StatusBadge>`** — un seul composant paramétrable (`variant="success|warning|danger|info|outline"`), fond `-100` + texte `-700`.
6. **Modales / Dialogs** — `rounded-xl shadow-modal`.
7. **Navigation** — sidebar (desktop) + bottom nav (mobile), déjà en place ; harmoniser.
8. **Devise** — `formatCurrency()` (`format-currency.ts`) partout, y compris les nouveaux composants.

---

## 8. Breakpoints

| Nom | Largeur |
|-----|---------|
| Mobile | `< 640px` (`sm`) |
| Tablette | `640–768px` |
| Desktop | `> 768px` (`md`+) |

Mobile-first : la mise en page de base est mobile, les variantes desktop s'ajoutent via `md:`/`lg:`.

---

## 9. Règles d'application (Phase 3)

1. **Priorité** : dashboards (4 rôles) → paiements → listes + formulaires → TD/TP, devoirs, cours, programme → paramètres, années, affectations.
2. Remplacer toute couleur brute (`bg-green-100`, `text-gray-500`, `text-blue-600`…) par les tokens de ce document.
3. Remplacer toute taille arbitraire (`text-[10px]`, `min-h-[44px]`, `h-[120px]`) par l'échelle canonique (garder `min-h-[44px]` pour les zones tactiles uniquement).
4. Unifier les badges en `<StatusBadge>`.
5. Vérifier 375px sur chaque page modifiée.

---

## 10. Fichiers sources

- `tailwind.config.ts` — tokens encodés (`brand`, `marine`, `neutral`, `success`, `warning`, `danger`, `info`, échelles).
- `src/app/globals.css` — variables CSS sémantiques (shadcn + `--success`/`--warning`/`--info`).
- `src/lib/utils/format-currency.ts` — formatage FCFA.
