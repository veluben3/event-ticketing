# AI Event Search Plan

## Goal

Add an AI-powered search layer that understands natural-language queries about events, stores event knowledge in Qdrant, and retrieves the most relevant events for the existing search experience.

## Why this change

The current search in `backend/src/services/events.service.ts` is strong for exact filters and partial text matches, but it does not understand intent-heavy queries such as:

- "family friendly comedy shows this weekend"
- "cheap music events near anna nagar"
- "tech meetups with networking and workshops"

An AI retrieval layer can improve recall and ranking for these searches while still preserving existing filters.

## Proposed architecture

### 1. New service: `AI-backend/`

A dedicated FastAPI service will own:

- Event ingestion from the main backend
- Event document creation and embedding
- Storage in Qdrant
- Semantic retrieval and future reranking
- Search endpoints consumed by the frontend or Node backend

### 2. Indexing flow

1. Read published events from the existing backend or direct event payloads.
2. Build one canonical text block per event including:
   - title
   - description
   - venue and city
   - category
   - organizer details when useful
   - ticket type names and conditions
3. Store metadata separately for filters:
   - eventId
   - city
   - category
   - venue
   - startAt / endAt
   - minPriceCents
   - status
4. Generate embeddings.
5. Upsert vectors to a Qdrant collection.

### 3. Query flow

1. Receive a natural-language search query.
2. Embed the query.
3. Search Qdrant with optional metadata filters.
4. Return top matches with scores.
5. Later: rerank results with an LLM or cross-encoder.

## Storage choice

Qdrant is a strong fit because it supports vector search plus metadata filtering, which we need for city/category/date constraints alongside semantic similarity.

## Retrieval strategy

### Phase 1

- Dense semantic retrieval with Qdrant
- Metadata filters for city and category
- Deterministic fallback embeddings for local development

### Phase 2

- Hybrid keyword + vector search
- Better chunking for long event descriptions
- Improved ranking based on date relevance and ticket affordability

### Phase 3

- LLM-assisted query rewriting
- Reranking model for final ordering
- Search analytics and offline relevance evaluation

## Integration options

### Option A

Frontend calls `AI-backend` directly for semantic search.

### Option B

Node backend proxies semantic search and merges it with existing filters.

### Recommended first step

Start with `AI-backend` exposing search APIs and keep the current Node search untouched until retrieval quality is validated.

## Risks and mitigations

- Embedding cost: support local deterministic embeddings in dev and configurable providers in prod.
- Ingestion drift: create explicit sync endpoints and document payload shape.
- Relevance instability: return debug scores early and keep rollback path to current search.
- Operational complexity: keep `AI-backend` isolated and independently deployable.

## Initial deliverables

- Project skills for Python / FastAPI / LangChain
- `AI-backend` FastAPI scaffold
- Qdrant collection management
- Event sync and upsert endpoints
- Semantic search endpoint
- Task board for next integration milestones
