# Playground

A modular sub-app platform for iOS built with React Native/Expo and a Rails API backend. Sub-apps are self-contained features that can be dynamically enabled, ordered, and delivered without app store resubmission.

## Architecture

```
┌─────────────────────────────┐      ┌──────────────────────────┐
│         Frontend            │      │         Backend          │
│   React Native / Expo       │◄────►│   Rails 8.1 API          │
│                             │      │                          │
│  ┌───────────────────────┐  │      │  GET /api/v1/sub_apps    │
│  │   Sub-App Registry    │  │      │                          │
│  │  ┌─────────────────┐  │  │      │  ┌──────────────────┐   │
│  │  │  Hello World    │  │  │      │  │  SubApp Model    │   │
│  │  │  (more...)      │  │  │      │  │  name, slug,     │   │
│  │  └─────────────────┘  │  │      │  │  icon, color,    │   │
│  └───────────────────────┘  │      │  │  position,       │   │
│                             │      │  │  enabled          │   │
└─────────────────────────────┘      │  └──────────────────┘   │
                                     └──────────────────────────┘
```

The backend serves a registry of available sub-apps. The frontend fetches this list, displays them on the home screen, and loads the matching local component when a user taps one. New sub-apps can be added to the frontend and enabled from the backend independently.

## Prerequisites

- [mise](https://mise.jdx.dev/) (or manually install Ruby 3.3.6 and Node 20)
- [Homebrew](https://brew.sh/) (macOS)

```sh
brew install mise libyaml
mise install        # installs Ruby 3.3.6 and Node 20
```

## Getting Started

### Backend

```sh
cd backend
bundle install
bin/rails db:create db:migrate db:seed
bin/rails server
```

The API will be available at `http://localhost:3000`. Verify with:

```sh
curl http://localhost:3000/api/v1/sub_apps
```

### Frontend

```sh
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` for the iOS simulator.

## Adding a Sub-App

1. **Backend** — Create a record in the `sub_apps` table (via seed, migration, or console):
   ```ruby
   SubApp.create!(name: "My Feature", slug: "my-feature", icon: "star-outline", color: "#FF9800")
   ```

2. **Frontend** — Create the component and register it:
   ```
   frontend/src/sub-apps/my-feature/MyFeatureApp.tsx
   ```
   ```ts
   // frontend/src/sub-apps/registry.ts
   import MyFeatureApp from './my-feature/MyFeatureApp';

   const SUB_APP_REGISTRY = {
     'hello-world': HelloWorldApp,
     'my-feature': MyFeatureApp,   // add here
   };
   ```

## API

| Method | Endpoint             | Description                              |
|--------|----------------------|------------------------------------------|
| GET    | `/api/v1/sub_apps`   | List enabled sub-apps ordered by position |
| GET    | `/up`                | Health check                             |

### Response Example

```json
{
  "sub_apps": [
    {
      "id": 1,
      "name": "Hello World",
      "slug": "hello-world",
      "description": "A simple greeting screen",
      "icon": "hand-right-outline",
      "color": "#4CAF50"
    }
  ]
}
```

## Deployment

| Component | Platform | Trigger |
|-----------|----------|---------|
| Backend   | [Render](https://render.com) | Push to `main` with `backend/` changes |
| Frontend  | [Expo EAS](https://expo.dev) | Push to `main` with `frontend/` changes |

Configuration files:
- `render.yaml` — Render service and database definitions
- `.github/workflows/deploy.yml` — CI/CD pipeline
- `frontend/eas.json` — EAS build profiles

### Required Secrets (GitHub Actions)

| Secret | Purpose |
|--------|---------|
| `RENDER_DEPLOY_HOOK_URL` | Triggers Render redeploy |
| `EXPO_TOKEN` | Authenticates EAS CLI |

## Tech Stack

- **Frontend**: React Native 0.83, Expo 55, React Navigation 7, TypeScript
- **Backend**: Ruby 3.3.6, Rails 8.1 (API-only), Puma
- **Database**: SQLite3 (development), PostgreSQL (production)
- **Tooling**: mise, GitHub Actions
