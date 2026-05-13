# Mobile App

React Native mobile client built with Expo and Expo Router.

## Tech Stack

- React Native
- Expo
- Expo Router
- TypeScript
- Redux Toolkit
- React Redux

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

- `src/app/`: Expo Router routes
- `src/features/`: business-domain screens and modules
- `src/components/`: shared UI building blocks
- `src/lib/`: API helpers and utilities
- `src/store/`: Redux Toolkit store and slices
- `src/theme/`: shared design tokens
- `src/assets/`: images and app assets

## Import Alias

- Use `@/` as the `src` root alias, for example `@/features/home/screens/home-screen`

## Next Recommended Steps

- Add `services/` or `api/` for HTTP clients and request wrappers
- Add `features/` for business-domain screens and logic
- Keep shared client state in Redux Toolkit slices and server state in TanStack Query
