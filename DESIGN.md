# Design System — GESchool

## Typographie

| Usage | Font | Fallback | Poids |
|-------|------|----------|-------|
| Titres (h1-h6) | Outfit | `system-ui, sans-serif` | 600-700 |
| Corps | Inter | `system-ui, -apple-system, sans-serif` | 400-500 |
| Mono | (inherited) | `monospace` | — |

Les titres utilisent `font-heading` (Outfit), le corps `font-sans` (Inter).

## Palette

### Mode clair

| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | `40 20% 99%` | Fond de page (blanc chaud) |
| `--foreground` | `220 25% 10%` | Texte principal (noir doux) |
| `--primary` | `27 96% 51%` | Actions principales, liens, accents forts |
| `--primary-foreground` | `30 40% 98%` | Texte sur fond primaire |
| `--secondary` | `35 30% 94%` | Fond secondaire (beige clair) |
| `--muted` | `35 20% 96%` | Fond discret |
| `--muted-foreground` | `220 10% 46%` | Texte secondaire |
| `--accent` | `27 20% 92%` | Survol / accent doux |
| `--border` | `35 20% 88%` | Bordures |
| `--card` | `0 0% 100%` | Fond des cartes |
| `--radius` | `0.75rem` | Bordures arrondies |

### Mode sombre

Les mêmes teintes avec luminosité inversée. Le primaire passe à `27 96% 55%` (légèrement plus clair pour la lisibilité).

## Espacement

Toute la mise en page suit l'échelle Tailwind (base 4px) :
`p-1` (4px) → `p-2` (8px) → `p-3` (12px) → `p-4` (16px) → `p-6` (24px) → `p-8` (32px) → `p-12` (48px)

Les sections de contenu utilisent `py-16 md:py-24` (64px → 96px).

## Bordures & Coins

| Élément | Border-radius |
|---------|---------------|
| Cartes / sections | `rounded-xl` (12px) |
| Boutons | `rounded-md` (8px) |
| Inputs | `rounded-md` (8px) |
| Badges / tags | `rounded-full` |

## Ombres

| Élément | Classe |
|---------|--------|
| Cartes | `shadow` (sm) |
| Cartes survolées | `shadow-lg` |
| Bouton primaire | `shadow-lg shadow-primary/20` |
| Modales | `shadow-xl` |

## Animations

| Nom | Durée | Easing | Usage |
|-----|-------|--------|-------|
| `fade-up` | 0.6s | ease-out | Entrée au scroll |
| `fade-in` | 0.8s | ease-out | Premier affichage |
| `accordion-down/up` | 0.2s | ease-out | Accordéons |

## Icons

Lucide React. Taille standard : 16-24px. Couleur : `text-foreground` ou `text-primary`.

## Composants

La librairie utilise [shadcn/ui](https://ui.shadcn.com) comme base, avec personnalisation via les CSS variables ci-dessus.

### Patterns d'états vides

Les pages avec liste affichent un message centré et un bouton d'action quand aucune donnée n'existe. Pas de "Aucun élément" sans contexte.

## Breakpoints

- Mobile : `sm` (640px)
- Tablette : `md` (768px)
- Desktop : `lg` (1024px)
- Large : `xl` (1280px)
