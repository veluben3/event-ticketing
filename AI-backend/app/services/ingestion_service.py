import hashlib
import uuid
from app.models.schemas import EventPayload
from app.services.event_documents import build_event_document
from app.services.vector_store import VectorStoreFactory


class IngestionService:
    def __init__(self, vector_store_factory: VectorStoreFactory) -> None:
        self.vector_store = vector_store_factory.build()
        self.collection = vector_store_factory.settings.qdrant_collection

    def _generate_uuid_from_id(self, event_id: str) -> str:
        # Qdrant local requires valid UUIDs or integers as point IDs.
        # We hash the original string ID to a deterministic UUID.
        hash_obj = hashlib.md5(event_id.encode())
        return str(uuid.UUID(hash_obj.hexdigest()))

    def upsert_events(self, events: list[EventPayload]) -> int:
        if not events:
            return 0

        documents = [build_event_document(event) for event in events]
        ids = [self._generate_uuid_from_id(event.id) for event in events]
        self.vector_store.add_documents(documents=documents, ids=ids)
        return len(events)
