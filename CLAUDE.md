# CLAUDE.md — ScolioCareAPP

This file provides guidance to Claude Code when working on the **ScolioCareAPP** Expo project.

## What this is

ScolioScan Mobile: the patient-facing native mobile app for the ScolioScan clinical platform. Final-year academic project at **UTAD** (Universidade de Trás-os-Montes e Alto Douro) in collaboration with **Jilin University**.

This app is the **PACIENTE profile only**. The web platform (doctors, technicians, admin) lives in a separate repo (`ScolioCare/`). Both projects share the same Supabase backend and domain types.

## Companion web project

The web app lives at `../../ScolioCare/` (relative to this project). The domain types and repository patterns there are the authoritative reference. When in doubt about business logic, check the web project first.

## Commands

```bash
npx expo start          # start dev server — scan QR with Expo Go on Android/iOS
npx expo start --clear  # clear Metro cache and restart
npx tsc --noEmit        # type check — run before declaring work done
```

Use **npm** for package management (installed by create-expo-app). Do not use pnpm or yarn.

## Tech stack — do not change without asking

- **Expo** (managed workflow) + React Native + TypeScript (strict)
- **Expo Router** (file-based routing) — screens live in `app/`
- **NativeWind v4** — Tailwind syntax for React Native styling
- React Native `StyleSheet` as fallback where NativeWind is insufficient
- **Supabase** (`@supabase/supabase-js`) — same project as the web app
- **lucide-react-native** for icons (same icon set as the web project)
- Forms use **native React state** — no react-hook-form, no formik
- `expo-secure-store` for persisting the auth session securely on device

### Anti-stack — never introduce these

shadcn/ui, Radix UI, MUI, Emotion, styled-components, react-query, axios, zustand, redux, react-hook-form, NativeBase, Gluestack. Keep dependencies minimal.

## This app: PACIENTE profile only

The only user who logs into this app is **Maria Silva** (`maria.silva@scolio.pt` / `paciente123` in dev). No doctor, technician, or admin functionality belongs here.

### Screens to build (mirrors the web `/mobile/*` screens)

| Screen | Description |
|---|---|
| Login | Email + password, biometric prompt banner |
| Onboarding | First-run welcome flow |
| Home | Last exam summary, mini evolution chart, notifications preview, wellness CTA |
| Exam List | Full history of exams with Cobb angle and status badge |
| Exam Detail | Full exam view — Cobb angle, status, clinical notes, PDF link |
| Exam Comparison | Side-by-side comparison of two exams |
| Wellness Log | Log daily pain level (0–9), discomfort, free-text notes |
| Notifications | List of push/in-app notifications |
| Profile | Patient profile info, settings, logout |
| Assistant | AI chat assistant for patient questions |
| 2FA Setup | TOTP two-factor authentication setup |

### Navigation structure (Expo Router)

```
app/
  _layout.tsx              ← root layout, AuthProvider, navigation container
  index.tsx                ← redirects to (auth)/login or (tabs)/home
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
    assistant.tsx
```

## Domain layer

### Types (`src/data/types.ts`)

Copy from the web project's `src/data/types.ts`. The types relevant for this app:

```typescript
Paciente               // the authenticated user (perfil === 'PACIENTE')
EstadoEstudo           // exam status: 'UPLOADED' | 'PROCESSING' | 'PENDING_VALIDATION' | 'VALIDATED' | 'DIAGNOSED' | 'SENT' | 'ARCHIVED'
EstudoComResultado     // exam with Cobb angle result
ResultadoEstudo        // anguloCobb, grauCurvatura, localizacaoCurva, nivelVertebras
WellnessLogEntry       // nivelDor (0-9), desconforto, notas
HistoricoEstadoEntry   // audit trail of exam state transitions
```

### Repository (`src/data/repository/`)

Mirrors the web project's repository layer. Create:

- `auth.ts` — `login()`, `logout()`, `subscribeToMudancasAuth()`
- `estudos.ts` — `getEstudosDoPaciente(pacienteId)`, `getHistoricoEstadoDoPaciente(pacienteId)`
- `wellness.ts` — `getWellnessLogDoPaciente(pacienteId)`, `addWellnessEntry()`

**All repository functions must be `async`**, even when reading from cache. Screens never import from Supabase directly.

### Supabase config (`src/lib/supabase.ts`)

Same Supabase project as the web app. Store credentials in `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Access with `process.env.EXPO_PUBLIC_SUPABASE_URL`. Use `expo-secure-store` as the storage adapter for Supabase auth (replaces `localStorage` from the web).

```typescript
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
```

## Authentication (`src/context/AuthContext.tsx`)

Mirrors the web's `src/app/auth/AuthContext.tsx`.

Exposes `{ utilizador, estaAutenticado, aCarregar, login, logout }`.

- The authenticated user will always have `perfil === 'PACIENTE'`
- Session is restored from `expo-secure-store` on app launch via `supabase.auth.onAuthStateChange`
- While `aCarregar` is true, render nothing (prevents navigation flicker)

## Design

### Colour palette (same as web project)

```
Primary blue:    #1A6FAF   (main patient accent)
Success green:   #1D9E75
Warning amber:   #F59E0B
Danger coral:    #EF4444
Text primary:    #1A1A2E
Text secondary:  #6B7280
Page surface:    #F8FAFC
Border light:    #E5E7EB
Light blue surface: #EFF6FF
```

Define these in `tailwind.config.js` under `theme.extend.colors` with the `scolio-` prefix (e.g., `scolio-primary-blue`) so NativeWind classes match the web naming.

### Components (`src/components/`)

Build reusable primitives:
- `Button` — `variant: 'primary' | 'secondary' | 'ghost'`
- `StatusBadge` — maps `EstadoEstudo` to PT-PT label + colour
- `CobbAngleDisplay` — large numeric display for the Cobb angle
- `SkeletonLoader` — loading placeholder

### Safe areas

Always wrap screens with `SafeAreaView` from `expo-safe-area-context` or use `useSafeAreaInsets()`. Never hardcode status bar heights.

### Touch targets

Minimum 44×44 logical pixels. Use `minHeight: 44, minWidth: 44` on interactive elements.

## Language

- **All user-facing text is European Portuguese (pt-PT).** Examples:
  - `"Email ou password incorretos."` not `"Invalid credentials."`
  - `"ecrã"` not `"tela"`, `"ficheiro"` not `"arquivo"`, `"utilizador"` not `"usuário"`, `"guardar"` not `"salvar"`, `"rato"` not `"mouse"`
- **Code, comments, and commit messages are in English.**
- **Variable and function names follow the domain language**: `utilizador`, `paciente`, `estudo`, `resultado`, `aCarregar`. These match the web project and the Supabase schema exactly.

## TypeScript

- `strict: true`
- Configure path alias `@/*` → `src/*` in both `tsconfig.json` and `babel.config.js`
- Run `npx tsc --noEmit` before declaring any task done

## Doctrine — never break these

1. **Never use web-only APIs** (`localStorage`, `document`, CSS variables, `window`).
2. **Never bypass the repository layer.** Screens call `src/data/repository/*.ts`, never Supabase directly.
3. **Never write user-facing strings in English or pt-BR.** PT-PT only.
4. **Never introduce anti-stack libraries.**
5. **Never hardcode colours** in multiple places — define them once in `tailwind.config.js`.
6. **Run `npx tsc --noEmit` before declaring work done.**
7. **When uncertain, ask before changing.** This is a graded final-year project.

## Demo credentials

| Profile  | Email                    | Password      |
|----------|--------------------------|---------------|
| PACIENTE | `maria.silva@scolio.pt`  | `paciente123` |

## Starting state (what is not yet installed)

The project was created with `create-expo-app --template blank-typescript`. The following still need to be installed and configured:

1. **Expo Router** — `npx expo install expo-router expo-linking expo-constants expo-status-bar`
2. **NativeWind v4** — `npm install nativewind` + `npm install -D tailwindcss` + `tailwind.config.js`
3. **Supabase** — `npm install @supabase/supabase-js` + `npm install expo-secure-store`
4. **Safe area** — `npx expo install react-native-safe-area-context react-native-screens`
5. **Icons** — `npm install lucide-react-native react-native-svg`

After installing, restructure from the default `App.tsx` entry point to the `app/` directory structure above.
