# Yunjian Zhiyu

Monorepo for the Yunjian Zhiyu project.

## Stack

- Mobile: React Native, Expo, Expo Router, TypeScript
- Backend: Python, FastAPI, uv

## Repository Structure

- `apps/mobile/`: React Native application
- `apps/server/`: FastAPI backend
- `develop_doc/`: project notes and supporting documentation

## Prerequisites

- Node.js 22+
- pnpm 10+
- Python 3.12+
- uv

## Quick Start

Install frontend dependencies:

```bash
pnpm install
```

Install backend dependencies:

```bash
uv sync --project apps/server
```

Start the mobile app:

```bash
pnpm dev:mobile
```

Start the backend:

```bash
pnpm dev:server
```

## Common Commands

```bash
pnpm lint:mobile
pnpm lint:server
pnpm test:server
pnpm check
```

## Environment Setup

- `apps/mobile/.env`: mobile runtime variables
- `apps/server/.env`: backend runtime variables

Create both files from their corresponding `.env.example` files before development.

## Development Readiness

This repository now provides:

- a root workspace entry for frontend tooling
- unified root-level scripts for mobile and backend development
- backend lint and test commands
- project-level documentation for onboarding

Recommended next step: begin replacing starter screens and add the first real API router and feature module.

yunjian-zhiyu\apps\server> uv run arq app.workers.arq_worker.WorkerSettings
yunjian-zhiyu> pnpm dev:server