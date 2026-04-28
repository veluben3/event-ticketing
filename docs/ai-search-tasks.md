# AI Event Search Tasks

## Status legend

- `[x]` done
- `[ ]` pending
- `[-]` next

## Foundation

- [x] Add `.skills/python/SKILL.md`
- [x] Add `.skills/fastapi/SKILL.md`
- [x] Add `.skills/langchain/SKILL.md`
- [x] Create AI search architecture plan
- [x] Create `AI-backend/` FastAPI project structure

## AI backend implementation

- [x] Add FastAPI app entrypoint and health endpoint
- [x] Add environment-driven settings for Qdrant and embedding provider
- [x] Add deterministic local embedding fallback
- [x] Add Qdrant collection bootstrap logic
- [x] Add LangChain/Qdrant vector store integration
- [x] Add event document builder for indexing
- [x] Add semantic search endpoint
- [x] Add event upsert endpoint
- [x] Add bulk sync endpoint that reads from the main backend

## Next integration milestones

- [-] Wire the frontend search box to call `AI-backend` for semantic queries
- [ ] Decide whether frontend calls `AI-backend` directly or through Node backend
- [ ] Add date-aware and price-aware ranking features
- [ ] Add hybrid keyword + dense retrieval
- [ ] Add reranking step for better top-result quality
- [ ] Add ingestion trigger on event create/update/publish
- [ ] Add automated tests for sync, search, and metadata filtering
- [ ] Add Docker and compose wiring for `AI-backend` + Qdrant

## Suggested order

1. Run `AI-backend` locally with Qdrant local mode.
2. Sync published events from the main backend.
3. Manually test semantic queries.
4. Integrate the frontend search form.
5. Add quality measurement before enabling by default.
