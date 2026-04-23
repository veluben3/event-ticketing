import json
import os
from datetime import datetime
from app.models.schemas import EventPayload, EventImagePayload, TicketTypePayload
from app.services.ingestion_service import IngestionService
from app.services.vector_store import VectorStoreFactory
from app.core.config import get_settings

def map_kyn_to_local(kyn_event):
    # Map category to something compatible with our enum if possible, else OTHER
    # Our categories: MUSIC, SPORTS, CONFERENCE, THEATRE, FESTIVAL, COMEDY, WORKSHOP, OTHER
    category_map = {
        "kids": "OTHER",
        "music": "MUSIC",
        "sports": "SPORTS",
        "workshops": "WORKSHOP",
        "comedy": "COMEDY",
        "theatre": "THEATRE"
    }
    category = category_map.get(kyn_event.get("category", "").lower(), "OTHER")
    
    # Handle dates
    start_at = kyn_event.get("startsAt") or kyn_event.get("startDate")
    end_at = kyn_event.get("endsAt") or kyn_event.get("endDate")
    
    # Coordinates - Kyn usually has them in location or not at all in this summary
    # For now we use Chennai as default city if not provided
    city = (kyn_event.get("location") or {}).get("value", "Chennai")
    
    # Images
    images = []
    banner_url = None
    if "eventImages" in kyn_event:
        banners = (kyn_event.get("eventImages") or {}).get("bannerUrl", [])
        if banners:
            banner_url = banners[0]
            images.append(EventImagePayload(id=None, url=banner_url, position=0))
    
    return EventPayload(
        id=kyn_event["eventId"],
        title=kyn_event["name"],
        description=kyn_event.get("description") or kyn_event["name"],
        category=category,
        venue=kyn_event.get("venue", "Various"),
        addressLine=(kyn_event.get("location") or {}).get("value"),
        city=city,
        state="Tamil Nadu",
        country="IN",
        latitude=None,
        longitude=None,
        startAt=datetime.fromisoformat(start_at.replace("Z", "+00:00")),
        endAt=datetime.fromisoformat(end_at.replace("Z", "+00:00")),
        priceCents=int(kyn_event.get("price") or 0),
        currency="INR",
        status="PUBLISHED",
        bannerUrl=banner_url,
        images=images,
        ticketTypes=[]
    )

from app.services.embedder import build_embeddings

def ingest_kyn_events():
    with open("kyn_raw_events.json", "r") as f:
        data = json.load(f)
    
    # Check if data is a list or wrapped in an object
    kyn_events = data if isinstance(data, list) else data.get("data", [])
    
    print(f"Found {len(kyn_events)} events in Kynhood raw data.")
    
    local_events = []
    for k in kyn_events:
        try:
            local_events.append(map_kyn_to_local(k))
        except Exception as e:
            print(f"Error mapping event {k.get('eventId')}: {e}")
    
    if not local_events:
        print("No events mapped successfully.")
        return

    settings = get_settings()
    embeddings = build_embeddings(settings)
    factory = VectorStoreFactory(settings, embeddings)
    ingestion_service = IngestionService(factory)
    
    count = ingestion_service.upsert_events(local_events)
    print(f"Successfully ingested {count} events into local Qdrant.")

if __name__ == "__main__":
    ingest_kyn_events()
