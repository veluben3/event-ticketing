# Python Skill

Use this skill when working inside `AI-backend/` or any Python service in this repository.

## Goals

- Prefer clear module boundaries over large utility files.
- Keep business logic out of route handlers.
- Use type hints everywhere in application code.
- Keep environment-driven configuration in one place.

## Conventions

- Target Python 3.11+.
- Prefer `pathlib.Path` over string path manipulation.
- Use Pydantic models for request/response and configuration.
- Keep side-effecting integrations behind service classes.
- Raise typed exceptions or `HTTPException` at API edges only.

## Structure

- `app/main.py`: FastAPI entrypoint.
- `app/api/`: routers only.
- `app/models/`: request/response schemas and domain DTOs.
- `app/services/`: orchestration, retrieval, indexing, embeddings.
- `app/clients/`: outbound HTTP or SDK wrappers.
- `app/core/`: config, constants, lifecycle wiring.

## Quality bar

- Make local development work without paid APIs when possible.
- Prefer deterministic fallback behavior for embeddings/tests.
- Keep functions short and dependency-injected.
- Add concise docstrings only where behavior is not obvious.
