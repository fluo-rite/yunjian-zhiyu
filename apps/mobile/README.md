# Mobile App

React Native mobile client built with Expo and Expo Router.

## Tech Stack

- React Native
- Expo
- Expo Router
- TypeScript

## Development

From the repository root:

```bash
pnpm install
pnpm dev:mobile
```

Or from this directory:

```bash
pnpm install
pnpm start
```

## Environment Variables

Copy `.env.example` to `.env` and adjust the API base URL if needed.

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Current Structure

- `app/`: route-based screens
- `components/`: shared UI building blocks
- `constants/`: theme and shared constants
- `hooks/`: reusable hooks
- `lib/`: environment and API helpers
- `assets/`: images and app assets

## Next Recommended Steps

- Add `services/` or `api/` for HTTP clients and request wrappers
- Add `features/` for business-domain screens and logic
- Introduce state management only when real shared state appears
