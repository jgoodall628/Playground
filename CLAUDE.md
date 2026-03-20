# Playground

Modular iOS sub-app platform: Rails API backend + React Native/Expo frontend.

## Project Structure

```
backend/    — Rails 8.1 API (Ruby 3.3.6, SQLite dev / PostgreSQL prod)
frontend/   — Expo/React Native app (TypeScript, Node 20)
```

## Setup

Prerequisites are managed via [mise](https://mise.jdx.dev/). Run `mise install` at the project root to install Ruby 3.3.6 and Node 20.

```sh
# Backend
cd backend
bundle install
bin/rails db:create db:migrate db:seed
bin/rails server  # http://localhost:3000

# Frontend
cd frontend
npm install
npx expo start    # http://localhost:8081
```

Note: If `psych` gem fails during `bundle install`, configure the libyaml path:
```sh
bundle config build.psych --with-libyaml-dir=$(brew --prefix libyaml)
```

## Backend

- **API-only** Rails app. Single resource: `SubApp`.
- Routes: `GET /api/v1/sub_apps` (enabled apps, ordered by position), `GET /up` (health check).
- Model validations: name required, slug required + unique + format (`/\A[a-z0-9-]+\z/`).
- CORS is wide open (all origins) — tighten for production.
- Database: SQLite3 for dev/test, PostgreSQL for production via `DATABASE_URL`.

## Frontend

- Entry: `index.ts` → `App.tsx` → `AppNavigator.tsx` (React Navigation stack).
- Two screens: `HomeScreen` (fetches sub-apps from API) and `SubAppScreen` (loads component by slug).
- **Sub-app registry pattern**: `src/sub-apps/registry.ts` maps slugs → React components.
- To add a new sub-app: create component in `src/sub-apps/<slug>/`, register in `registry.ts`.
- API client in `src/api/client.ts` — uses `__DEV__` to toggle localhost vs production URL.
- Production API URL: `https://playground-api-dyu9.onrender.com/api/v1`.

## Deployment

- **Backend**: Render (see `render.yaml`). Auto-deploys from GitHub when `backend/` changes (managed by Render).
- **Frontend**: Expo EAS OTA updates. Auto-publishes via GitHub Actions when `frontend/` changes.
- CI/CD workflow: `.github/workflows/deploy.yml` (frontend only).
- Required secrets: `EXPO_TOKEN`.

## Preview on Device

The app uses Expo SDK 54 for compatibility with Expo Go. To preview on a physical device:

1. Install **Expo Go** from the App Store (or Google Play).
2. Sign in with the Expo account (`jgoodall628`).
3. Push an EAS update from the `frontend/` directory:

```sh
cd frontend
mise exec -- npx eas update --branch preview --message "description" --environment preview --non-interactive
```

4. Open Expo Go on your phone — the update appears under your projects.

This also works when running Claude Code remotely (e.g., cloud VM) since EAS updates are uploaded to Expo's servers — no local network required.

## Shell Commands

- Run each command separately — do not chain with `&&`, `;`, or `|` unless piping is essential.
- All `ruby`, `rails`, `bundle`, `node`, `npm`, and `npx` commands must be prefixed with `mise exec --` to use the correct runtime versions. The Bash tool does not inherit mise shell activation.
- When a command must run from a subdirectory, use a single `cd` call first in one tool call, then the command in a separate tool call.

```sh
# Change to backend directory (first tool call)
cd /Users/jeffreygoodall/development/Playground/backend

# Run backend tests (separate tool call)
mise exec -- bin/rails test

# Change to frontend directory (first tool call)
cd /Users/jeffreygoodall/development/Playground/frontend

# Run frontend type check (separate tool call)
mise exec -- npx tsc --noEmit

# Verify API (no mise needed for curl)
curl http://localhost:3000/api/v1/sub_apps
```

## Pre-commit Testing

Before committing any changes, always run the relevant tests:

- **Backend changes** (`backend/**`): Run `mise exec -- bin/rails test` from the `backend/` directory.
- **Frontend changes** (`frontend/**`): Run `mise exec -- npx jest --passWithNoTests` from the `frontend/` directory.
- If changes span both directories, run both test suites.
- Do not commit if tests fail — fix the issues first.
