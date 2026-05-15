# CLAUDE.md — ScolioCareAPP

Working guide for the **ScolioCareAPP** project (Expo/React Native).

## What this project is

ScolioScan Mobile: native app for the **patient** side of the ScolioScan clinical platform. Final-year project at UTAD in collaboration with Jilin University.

This app is **exclusively for the PACIENTE role**. All doctor, technician and administration functionality lives in the companion web project `ScolioCare/`.

## Companion web project — ScolioCare

The web project is located at:
```
C:\Users\diogo\OneDrive\Ambiente de Trabalho\UTAD\3ºAno\2º Semestre\Trabalho Final\ScolioCare\
```

Both projects share the **same Supabase project**. When in doubt about business logic, types or schema, the web project is the authoritative reference.

NOTE: When I say "ScolioCareWeb" I am referring to that folder — anything you need to check, look in that folder.

### Types and repository

Domain types (`src/data/types.ts`) and repository patterns (`src/data/repository/`) mirror the web project. Never diverge from the Supabase schema field names.

## Commands

```bash
npx expo start          # start dev server (QR code for Expo Go)
npx expo start --clear  # clear Metro cache and restart
npx tsc --noEmit        # type-check — run before declaring work done
```

Use **npm** for package management. Do not use pnpm or yarn.

## Tech stack — do not change without asking

- **Expo** (managed workflow) + React Native + TypeScript (strict)
- **Expo Router** (file-based routing) — screens in `app/`
- **NativeWind v4** — Tailwind syntax for React Native
- React Native `StyleSheet` as fallback where NativeWind is insufficient
- **Supabase** (`@supabase/supabase-js`) — same project as the web
- **lucide-react-native** for icons
- Form state with **native React state** — no react-hook-form, no formik
- `expo-secure-store` to persist the auth session

### Anti-stack — never introduce

shadcn/ui, Radix UI, MUI, Emotion, styled-components, react-query, axios, zustand, redux, NativeBase, Gluestack.

## Navigation (Expo Router)

```
app/
  _layout.tsx              ← root layout, AuthProvider
  index.tsx                ← redirects to login or home
  (auth)/
    _layout.tsx
    login.tsx
    onboarding.tsx
    two-factor-setup.tsx
  (tabs)/
    _layout.tsx            ← bottom tab bar (Home, Exams, Wellness, Profile)
    home.tsx
    exams/
      index.tsx            ← exam list
      [id].tsx             ← exam detail
      compare.tsx          ← side-by-side comparison
    wellness-log.tsx
    notifications.tsx
    profile.tsx
    assistant.tsx          ← see docs/assistenteIA.md
```

## Design

### Colour palette (matches web)

```
Primary blue:       #1A6FAF
Success green:      #1D9E75
Warning amber:      #F59E0B
Danger coral:       #EF4444
Text primary:       #1A1A2E
Text secondary:     #6B7280
Page surface:       #F8FAFC
Border light:       #E5E7EB
Light blue surface: #EFF6FF
```

Defined in `tailwind.config.js` with the `scolio-` prefix (e.g. `scolio-primary-blue`).

### UI rules

- Safe areas: always use `SafeAreaView` from `expo-safe-area-context` or `useSafeAreaInsets()`. Never hardcode heights.
- Touch targets: minimum 44×44 logical px on interactive elements.

## Language

- **All user-visible text is European Portuguese (pt-PT).**
  - `"ecrã"` not `"tela"`, `"ficheiro"` not `"arquivo"`, `"guardar"` not `"salvar"`
- **Code, comments and commits in English.**
- **Variable and function names follow the domain**: `utilizador`, `paciente`, `estudo`, `resultado`, `aCarregar`. They map exactly to the Supabase schema.

## Doctrine — never break

1. **Never use web-only APIs** (`localStorage`, `document`, CSS variables, `window`).
2. **Never access Supabase directly in screens.** Screens call `src/data/repository/*.ts`.
3. **Never write user-facing text in English or pt-BR.**
4. **Never introduce anti-stack libraries.**
5. **Never hardcode colours** in multiple places — define once in `tailwind.config.js`.
6. **Run `npx tsc --noEmit` before declaring work done.**
7. **Always present a written plan before implementing.** List files to create/edit and open decisions. Only start coding after confirmation.

## Demo credentials

| Role     | Email                   | Password      |
|----------|-------------------------|---------------|
| PACIENTE | `maria.silva@scolio.pt` | `paciente123` |

## Git

When asked to commit, create the commit without a `Co-Authored-By` line.
