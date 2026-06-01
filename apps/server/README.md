# Server API

FastAPI backend for the Yunjian Zhiyu project.

## Tech Stack

- Python 3.12+
- FastAPI
- Redis Streams
- ARQ background generation pipeline
- PostgreSQL
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

Before starting the API, make sure PostgreSQL, Redis, and the initial Alembic migration are ready.

## Environment Variables

Copy `.env.example` to `.env` before local development.

```env
APP_NAME=Yunjian Zhiyu API
DEBUG=true
DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5432/yunjian_zhiyu
REDIS_URL=redis://127.0.0.1:6379/0
ARQ_QUEUE_NAME=chat-generation
STREAM_TTL_SECONDS=600
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=gpt-4.1-mini
```

## Database Setup

Initialize the schema with Alembic before running the app:

```bash
uv run --project apps/server alembic -c apps/server/alembic.ini upgrade head
```

Run an ARQ worker in a separate terminal:

```bash
pnpm dev:worker
```

Both commands run from `apps/server`, so the `app.*` package imports resolve correctly.

Both Alembic and the ARQ worker now load `DATABASE_URL` and `REDIS_URL` automatically from `apps/server/.env` through the shared settings module, so you do not need to export those variables manually in PowerShell first.

## Streaming Message Flow

- `POST /api/v1/chats/{chat_id}/messages`: create the user message and a `streaming` assistant placeholder, then dispatch background generation
- `GET /api/v1/chats/{chat_id}/messages`: fetch persisted history and discover any active streaming assistant messages
- `GET /api/v1/chats/{chat_id}/messages/{assistant_message_id}/stream?lastEventId=...`: replay and resume SSE events from the stream store
- `POST /api/v1/chats/{chat_id}/messages/{assistant_message_id}/abort`: request an in-flight generation abort

## Current Structure

- `app/main.py`: FastAPI application factory and entrypoint
- `app/api/`: routers, dependencies, and route modules
- `app/core/`: settings, database, and security helpers
- `app/models/`: SQLAlchemy models
- `app/schemas/`: request and response DTOs
- `app/services/`: business logic services
- `tests/`: backend tests
