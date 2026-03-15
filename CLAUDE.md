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
- Production API URL is a placeholder (`your-app.herokuapp.com`) — update after Render deploy.

## Deployment

- **Backend**: Render (see `render.yaml`). Auto-deploys via GitHub Actions when `backend/` changes.
- **Frontend**: Expo EAS OTA updates. Auto-publishes via GitHub Actions when `frontend/` changes.
- CI/CD workflow: `.github/workflows/deploy.yml`.
- Required secrets: `RENDER_DEPLOY_HOOK_URL`, `EXPO_TOKEN`.

## Commands

```sh
# Run backend tests (none yet)
cd backend && bin/rails test

# Run frontend type check
cd frontend && npx tsc --noEmit

# Verify API
curl http://localhost:3000/api/v1/sub_apps
```
