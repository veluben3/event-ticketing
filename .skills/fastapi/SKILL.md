# FastAPI Skill

Use this skill when creating or modifying APIs in `AI-backend/`.

## Routing rules

- Keep routes thin: validate input, call a service, return a typed response.
- Group related routes under versioned prefixes such as `/api/v1/search`.
- Use `response_model` whenever the output shape matters.
- Add a `/health` endpoint for orchestration and local checks.

## Dependency rules

- Use FastAPI lifespan hooks for startup/shutdown work.
- Expose shared services through lightweight dependency helpers when helpful.
- Avoid hidden globals except for configuration and intentionally shared clients.

## Error handling

- Convert domain errors to `HTTPException` close to the route layer.
- Return actionable messages for configuration and ingestion failures.
- Keep internal stack traces out of client-facing responses.

## Search-specific guidance

- Separate retrieval from ranking.
- Keep sync/index endpoints distinct from query endpoints.
- Include trace metadata in responses when debugging search quality.
