# Server API

FastAPI backend for the Yunjian Zhiyu project.

## Tech Stack

- Python 3.12+
- FastAPI
- uv
- pytest
- ruff

## Development

From the repository root:

```bash
pnpm dev:server
```

Or from this directory:

```bash
uv sync
uv run fastapi dev app/main.py
```

## Environment Variables

Copy `.env.example` to `.env` before local development.

```env
APP_NAME=Yunjian Zhiyu API
DEBUG=true
```

## Current Structure

- `app/main.py`: FastAPI application factory and entrypoint
- `app/api/`: routers and route modules
- `app/core/`: settings and shared infrastructure
- `tests/`: backend tests

## Next Recommended Steps

- Add `app/api/` for routers
- Add `app/core/` for settings, logging, and shared infrastructure
- Add `app/schemas/` and `app/services/` as business logic grows
