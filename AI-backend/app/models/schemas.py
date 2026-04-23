from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TicketTypePayload(BaseModel):
    id: str | None = None
    name: str
    description: str | None = None
    priceCents: int = Field(ge=0)


class EventImagePayload(BaseModel):
    id: str | None = None
    url: str
    position: int = 0


class EventPayload(BaseModel):
    id: str
    title: str
    description: str
    category: str
    venue: str
    addressLine: str | None = None
    city: str
    state: str | None = None
    country: str | None = "IN"
    latitude: float | None = None
    longitude: float | None = None
    startAt: datetime
    endAt: datetime
    priceCents: int = Field(ge=0)
    currency: str = "INR"
    status: str
    organizerId: str | None = None
    capacity: int | None = None
    ticketsSold: int | None = None
    bannerUrl: str | None = None
    images: list[EventImagePayload] = Field(default_factory=list)
    ticketTypes: list[TicketTypePayload] = Field(default_factory=list)


class SearchFilters(BaseModel):
    city: str | None = None
    category: str | None = None
    status: str | None = "PUBLISHED"


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int | None = Field(default=None, ge=1, le=100)
    filters: SearchFilters | None = None
    latitude: float | None = None
    longitude: float | None = None


class SearchResult(BaseModel):
    event_id: str
    id: str
    title: str
    description: str
    city: str
    category: str
    venue: str
    address_line: str | None = None
    state: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    start_at: str
    end_at: str
    price_cents: int
    currency: str
    status: str
    banner_url: str | None = None
    image_urls: list[str] = Field(default_factory=list)
    ticket_types: list[dict[str, Any]] = Field(default_factory=list)
    sentiment: str
    category_summary: str
    semantic_tags: list[str] = Field(default_factory=list)
    organizer_id: str | None = None
    score: float
    ai_explanation: str | None = None
    location_context: str | None = None
    metadata: dict[str, Any]


class SearchResponse(BaseModel):
    query: str
    answer: str | None = None
    count: int
    results: list[SearchResult]


class UpsertEventsRequest(BaseModel):
    events: list[EventPayload]


class UpsertResponse(BaseModel):
    collection: str
    upserted: int


class SyncResponse(BaseModel):
    synced: int
    source_url: str


class HealthResponse(BaseModel):
    status: str
    app: str
