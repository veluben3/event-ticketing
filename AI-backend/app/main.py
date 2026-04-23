from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import build_router
from app.core.config import get_settings
from app.services.embedder import build_embeddings
from app.services.ingestion_service import IngestionService
from app.services.search_service import SearchService
from app.services.vector_store import VectorStoreFactory


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="EventHub AI Backend", lifespan=lifespan)

    settings = get_settings()
    embeddings = build_embeddings(settings)
    vector_store_factory = VectorStoreFactory(settings, embeddings)
    ingestion_service = IngestionService(vector_store_factory)
    search_service = SearchService(settings, vector_store_factory)
    app.include_router(build_router(ingestion_service=ingestion_service, search_service=search_service))
    return app


app = create_app()
