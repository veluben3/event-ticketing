from fastapi import APIRouter

from app.clients.event_backend import EventBackendClient
from app.core.config import get_settings
from app.models.schemas import (
    HealthResponse,
    SearchRequest,
    SearchResponse,
    SyncResponse,
    UpsertEventsRequest,
    UpsertResponse,
)
from app.services.ingestion_service import IngestionService
from app.services.search_service import SearchService


def build_router(
    ingestion_service: IngestionService,
    search_service: SearchService,
) -> APIRouter:
    router = APIRouter()
    settings = get_settings()
    event_backend_client = EventBackendClient(settings.event_backend_url)

    @router.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", app=settings.app_name)

    @router.post("/api/v1/index/upsert", response_model=UpsertResponse)
    async def upsert_events(payload: UpsertEventsRequest) -> UpsertResponse:
        count = ingestion_service.upsert_events(payload.events)
        return UpsertResponse(collection=settings.qdrant_collection, upserted=count)

    @router.post("/api/v1/index/sync", response_model=SyncResponse)
    async def sync_events() -> SyncResponse:
        events = await event_backend_client.list_published_events()
        count = ingestion_service.upsert_events(events)
        return SyncResponse(synced=count, source_url=settings.event_backend_url)

    @router.post("/api/v1/search", response_model=SearchResponse)
    async def semantic_search(payload: SearchRequest) -> SearchResponse:
        return search_service.search(payload)

    return router
