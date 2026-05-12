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
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=local-fallback
```

When `LLM_BASE_URL` and `LLM_API_KEY` are not configured, the chat endpoint falls back to a local deterministic reply so frontend development can continue without an external model.

## Current Structure

- `app/main.py`: FastAPI application factory and entrypoint
- `app/api/`: routers, dependencies, and route modules
- `app/core/`: settings, database, and security helpers
- `app/models/`: SQLAlchemy models
- `app/schemas/`: request and response DTOs
- `app/services/`: business logic services
- `tests/`: backend tests
