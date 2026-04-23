from langchain_core.embeddings import Embeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

from app.core.config import Settings


class VectorStoreFactory:
    def __init__(self, settings: Settings, embeddings: Embeddings) -> None:
        self.settings = settings
        self.embeddings = embeddings
        self.client = self._build_client()

    def _build_client(self) -> QdrantClient:
        if self.settings.qdrant_url:
            return QdrantClient(
                url=self.settings.qdrant_url,
                api_key=self.settings.qdrant_api_key,
            )
        return QdrantClient(path=str(self.settings.qdrant_local_path))

    def ensure_collection(self, force_recreate: bool = False) -> None:
        collections = self.client.get_collections().collections
        exists = any(collection.name == self.settings.qdrant_collection for collection in collections)

        if exists and not force_recreate:
            return

        if exists and force_recreate:
            self.client.delete_collection(collection_name=self.settings.qdrant_collection)

        self.client.create_collection(
            collection_name=self.settings.qdrant_collection,
            vectors_config=VectorParams(
                size=self.settings.embedding_vector_size,
                distance=Distance.COSINE,
            ),
        )

    def build(self) -> QdrantVectorStore:
        try:
            self.ensure_collection()
            return QdrantVectorStore(
                client=self.client,
                collection_name=self.settings.qdrant_collection,
                embedding=self.embeddings,
            )
        except Exception as e:
            if "dimensions" in str(e).lower():
                # Recreate if dimension mismatch
                self.ensure_collection(force_recreate=True)
                return QdrantVectorStore(
                    client=self.client,
                    collection_name=self.settings.qdrant_collection,
                    embedding=self.embeddings,
                )
            raise e
