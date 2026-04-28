import httpx

from app.models.schemas import EventPayload


class EventBackendClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def list_published_events(self, page_size: int = 50) -> list[EventPayload]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{self.base_url}/events",
                params={"page": 1, "pageSize": page_size, "status": "PUBLISHED"},
            )
            response.raise_for_status()
            payload = response.json()

        return [EventPayload.model_validate(item) for item in payload.get("items", [])]
