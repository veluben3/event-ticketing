# AI-backend

FastAPI service for semantic event search using Qdrant and LangChain.

## What it does

- Syncs events from the main backend
- Builds canonical event documents
- Stores event vectors in Qdrant
- Runs semantic search with optional filters

## Run locally

```bash
cd AI-backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8001
```

## Important environment variables

```bash
AI_BACKEND_PORT=8001
EVENT_BACKEND_URL=http://localhost:4000/api
QDRANT_URL=
QDRANT_COLLECTION=events_semantic_search
QDRANT_LOCAL_PATH=./data/qdrant
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_PROVIDER=local
EMBEDDING_VECTOR_SIZE=256
```

## Endpoints

- `GET /health`
- `POST /api/v1/index/upsert`
- `POST /api/v1/index/sync`
- `POST /api/v1/search`
