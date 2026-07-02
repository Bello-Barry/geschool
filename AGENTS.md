# Geschool - Agent Guide

## Stack
- **Framework**: Next.js 15 App Router (src/ directory)
- **Auth/DB**: Supabase (multi-tenant via subdomain)
- **UI**: shadcn/ui + Tailwind CSS 3 + Lucide icons
- **Forms**: react-hook-form + zod
- **Testing**: Vitest (unit), Playwright (e2e)
- **Package manager**: pnpm (but npm run scripts work)
- **AI**: Gemini + DeepSeek

## Path aliases (tsconfig.json)
- `@/*` → `./src/*`
- `@/components/*` → `./src/components/*`
- `@/lib/*` → `./src/lib/*` **and** `./lib/*` (both resolve)
- `@/types/*` → `./src/types/*`
- `@/hooks/*` → `./src/hooks/*`

## Key commands
- `pnpm dev` — dev server on :3000
- `pnpm build` — production build
- `pnpm lint` — ESLint (config is minimal, just ignores)
- `pnpm test` — Vitest (jsdom, globals)
- `pnpm test:watch` / `pnpm test:ui` / `pnpm test:coverage`
- `pnpm test:e2e` — Playwright
- `pnpm create-school` — CLI (tsx scripts/create-school.ts)

## Multi-tenant architecture
- **Subdomain-based**: `school-name.localhost:3000` routes to that school's instance
- **Middleware** (`middleware.ts`): extracts subdomain, queries Supabase, injects `x-school-id`, `x-school-name`, `x-school-color`, `x-user-id`, `x-user-role` into request headers
- **School context** in server components: `getSchoolFromHeaders()` from `@/lib/utils/school-resolver`
- **Roles**: `super_admin`, `admin_school`, `teacher`, `parent`, `student`
- **Dashboard routes**: `/admin`, `/teacher`, `/parent`, `/student` (redirected by middleware based on role)

## Supabase client patterns (4 variants)
1. `src/lib/supabase/client.ts` — browser client (createBrowserClient)
2. `src/lib/supabase/server.ts` — server component (createServerClient + cookies())
3. `src/lib/supabase/middleware.ts` — middleware (createServerClient + NextRequest cookies)
4. `src/lib/supabase/admin.ts` — service-role admin (bypasses RLS, server-only)

## DB setup
- 5 migrations in `supabase/migrations/` (apply in order: schema → RLS → functions → triggers → seed)
- 17 tables, RLS on all tables
- DB functions: `calculate_subject_average`, `calculate_general_average`, `calculate_class_rank`, `update_updated_at_column`
- Types: manually defined in `src/types/database.ts` (not generated from Supabase schema)

## Env vars required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_ROOT_DOMAIN
DEEPSEEK_API_KEY / GEMINI_API_KEY (optional, for AI features)
```

## Notable quirks
- `@/lib/*` resolves to **both** `src/lib/*` and `lib/*` — be careful of duplication
- ESLint config is bare (`eslint.config.mjs` only sets ignores); actual rules come from `eslint-config-next`
- Types are hand-written, not auto-generated from Supabase — update `src/types/database.ts` when schema changes
- Two PostCSS config files exist (`postcss.config.js` + `postcss.config.mjs`); both are present
- Dashboard layout (`src/app/(dashboard)/layout.tsx`) is the canonical auth-gated wrapper
- Public routes (no auth required): `/`, `/about`, `/pricing`, `/contact`, `/login`, `/register`, `/reset-password`, `/verify-email`, `/set-password`, `/school-not-found`, `/api/detect-school`

## gstack skills installed
53 gstack skills are installed globally (`~/.config/opencode/skills/`). Invoke by name — `/office-hours`, `/qa`, `/ship`, `/browse`, `/review`, `/design-review`, `/cso`, etc. Full list in `~/.config/opencode/skills/` (one directory per skill). Re-run `./setup` from `~/.claude/skills/gstack/` after updating gstack. Requires `bun` + `bash` for the full setup; skills can also be manually recopied from `~/.claude/skills/gstack/`.
