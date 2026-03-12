# CLAUDE.md

## Project

- **Name:** opengame-app
- **Description:** The Open Game System (OGS) mobile app -- a React Native shell that gives web games native mobile capabilities (push notifications, TV casting, deep linking) via a WebView + app-bridge architecture
- **Tech stack:** React Native 0.83, Expo 55 (SDK 55), Expo Router, TypeScript (strict), React 19, pnpm
- **Key libraries:** @open-game-system/app-bridge-react-native, react-native-google-cast, expo-notifications, expo-linking, expo-secure-store
- **Bundle IDs:** org.opengame.app (iOS + Android)
- **EAS project:** c0d03bd6-9398-4eba-94f6-69fbd071d599 (owner: open-game-system)

## Knowledge Base

Start here. Load deeper docs **only when working on the relevant domain.**

| Topic | Location |
|---|---|
| System architecture | [docs/architecture.md](docs/architecture.md) |
| Lessons learned | [docs/lessons.md](docs/lessons.md) |

> **Progressive disclosure:** Do NOT load all docs upfront. Read this file,
> then load the specific doc relevant to your current task.

## Core Principles

- **TDD**: Write the test first, see it fail, implement, see it pass
- **Mutation Testing**: Stryker validates test quality; surviving log-string mutants are acceptable
- **Spec Traceability**: Behaviors should trace back to documented requirements

## Key Conventions

### React Native / Expo Patterns

- Expo Router file-based routing (`app/` directory)
- `app/_layout.tsx` handles global side effects (push notifications, deep links)
- `app/index.tsx` owns the WebView and Cast integration
- `jest-expo` preset is required for tests (configured in package.json)
- `expo/tsconfig.base` extended with strict mode enabled

### Store Patterns

- `services/game-url-store.ts` is a simple observable store (no Redux, no Zustand)
  - `setGameUrl()` / `consumePendingGameUrl()` / `subscribeToGameUrl()`
  - Bridges the gap between layout (receives URLs) and index (owns WebView)
- App Bridge uses `createStore` / `createNativeBridge` from @open-game-system/app-bridge-react-native
  - Producer pattern (immer-style drafts) for state updates
  - `on` handlers for side effects (e.g., `SHOW_CAST_PICKER` triggers GoogleCast dialog)

### Testing

- Tests live in `services/__tests__/` as `<module>.test.ts`
- Coverage collected from `services/**` and `app/**`
- Stryker mutates `services/**/*.ts` only (excludes test files)
- Mutation score thresholds: break at 60%, low at 70%, high at 90%

### Logging

- Tagged logging: `[Notifications]`, `[DeepLinks]`, `[GameUrlStore]`, `[Index]`, `[Native Store Listener]`

## Build & Test

```bash
# Unit tests (watch mode)
pnpm test

# Unit tests (CI mode with coverage)
pnpm test:ci

# Mutation testing
pnpm test:mutate

# Lint
pnpm lint

# Typecheck
pnpm typecheck

# Native prebuild
pnpm prebuild

# Start dev server
pnpm start

# EAS build (Android preview, non-blocking)
eas build --profile preview --platform android --non-interactive --no-wait
```

## CI / CD

Two GitHub Actions workflows:

1. **CI** (`.github/workflows/ci.yml`) -- runs on push/PR to main
   - Lint & Typecheck
   - Jest tests with coverage
   - Stryker mutation testing (depends on test job)

2. **EAS Build** (`.github/workflows/eas-build.yml`) -- runs on push/PR to main
   - Uses `expo/expo-github-action@v8`
   - Android-only (`--platform android`), `--no-wait` to avoid CI hangs
   - Requires `EXPO_TOKEN` secret

## Git

- Main branch: `main`
- Package manager: pnpm 9
- Never use `--no-verify` on git hooks
- Commit messages: concise, descriptive of the "why"
