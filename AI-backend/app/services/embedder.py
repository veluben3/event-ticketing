import hashlib

from langchain_core.embeddings import Embeddings
from langchain_openai import OpenAIEmbeddings

from app.core.config import Settings


class HashEmbeddings(Embeddings):
    def __init__(self, size: int) -> None:
        self.size = size

    def _embed(self, text: str) -> list[float]:
        vector = [0.0] * self.size
        tokens = text.lower().split()
        if not tokens:
            return vector

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            for index in range(self.size):
                byte = digest[index % len(digest)]
                vector[index] += (byte / 255.0) - 0.5

        scale = float(len(tokens))
        return [value / scale for value in vector]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)


def build_embeddings(settings: Settings) -> Embeddings:
    if settings.embedding_provider == "openai" and settings.openai_api_key:
        return OpenAIEmbeddings(
            api_key=settings.openai_api_key,
            model=settings.openai_embedding_model,
        )

    return HashEmbeddings(size=settings.embedding_vector_size)
