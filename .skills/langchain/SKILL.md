# LangChain Skill

Use this skill when building retrieval or LLM-assisted search in `AI-backend/`.

## Core approach

- Treat LangChain as orchestration glue, not the center of the system.
- Keep document chunking, metadata mapping, embedding generation, and retrieval explicit.
- Preserve event metadata richly so filtering can happen at retrieval time.

## Qdrant usage

- Store event text as `Document.page_content`.
- Store event identifiers, city, category, venue, ticket types, and timing in metadata.
- Use dense similarity first, then add filters and reranking if needed.
- Keep collection creation/configuration centralized.

## Search quality

- Build a single canonical event text representation before embedding.
- Include structured fields in metadata even if they are also embedded into text.
- Return retrieval scores and matched metadata during early rollout for evaluation.
- Add deterministic local embeddings fallback so ingestion/search can run in development without external model credentials.

## Evolution path

1. Keyword + semantic hybrid retrieval.
2. Metadata filtering by city/category/date.
3. Reranking with an LLM or cross-encoder.
4. Offline relevance evaluation with saved queries.
