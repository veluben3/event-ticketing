import requests
import json
import os
import re
from urllib.parse import urlparse, parse_qs
from datetime import datetime
from typing import List, Dict, Any
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
# You can add more section IDs here in the future
SECTION_IDS = [

   "688b689acaf24a0298695792",
    # "69a543d75724bd0012ccec46",  # She & Co
    # "another_section_id_here", 
]

# The organization ID to associate these events with
ORGANIZATION_ID = "cmoa7px4a0000x03q5l2rv3jd"

# JWT Token for authentication with the Main Backend
# You can get this from the browser's localStorage or cookies after logging in as an organizer/admin
AUTH_TOKEN = os.environ.get("MAIN_BACKEND_AUTH_TOKEN", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW9hN3B4NGEwMDAweDAzcTVsMnJ2M2pkIiwic2lkIjoiZGU3ZmIyZDUtYjYzYi00NmQyLTkwZGQtYjM2Yjc0NDJmZmU1Iiwicm9sZSI6Ik9SR0FOSVpFUiIsImVtYWlsIjoib3JnYW5pemVyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzc2OTMxOTA3LCJleHAiOjE3NzY5MzI4MDd9.cJ61fVTPGKeOcmP9UOwQ_Ye9-iaXFJOZ1feUGxcGIcA")
# Note: To run this script, you can set the environment variable:
# export MAIN_BACKEND_AUTH_TOKEN="your_token_here"
# or replace the default value above.

# Kynhood API endpoints
KYN_EVENTS_URL = "https://kyn-api.kynhood.com/api/events"
KYN_SECTIONS_URL = "https://kyn-api.kynhood.com/api/events/sections"

# Local Backend API endpoints
LOCAL_BACKEND_URL = "http://localhost:4000/api/v1/events" # Adjust if needed, but standard is usually /api/events
# Actually, looking at the code, it should be the endpoint that accepts Event creation.
# Based on events.routes.ts, it's POST /api/events
LOCAL_BACKEND_CREATE_URL = "http://localhost:4000/api/events"
LOCAL_BACKEND_MINE_URL = "http://localhost:4000/api/events/mine"

# Headers for Kynhood API
HEADERS = {
    "accept": "*/*",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiR1VFU1QiLCJleHAiOjE3NzkzNDY5MjcsInR5cGUiOiJjdXN0b20iLCJyb2xlIjoiR1VFU1QiLCJhY2Nlc3NMZXZlbCI6MCwic3ViIjoiNmQwOTk1YWMtZWJiZi00YjBlLWJjMmYtMjJmYTc3ZTRmMzNlIiwidXNlcl9pZCI6IjY5ZTcyMGVmZDg3ZjJjMDAxMmEzMWJlMyIsImlhdCI6MTc3Njc1NDkyOH0._C3ouV_AKbLdj12Y9nTOouacBk6evHYwB9L4dJsT9sA",
    "content-type": "application/json",
    "origin": "https://kynhood.com",
    "referer": "https://kynhood.com/",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "x-user-agent": "Web"
}

# --- Import AI Backend modules ---
from app.models.schemas import EventPayload, EventImagePayload
from app.services.ingestion_service import IngestionService
from app.services.vector_store import VectorStoreFactory
from app.core.config import get_settings
from app.services.embedder import build_embeddings

def fetch_events_from_sections(section_ids: List[str]) -> List[Dict[str, Any]]:
    """Fetches events from specific Kynhood sections."""
    all_events = []
    if not section_ids:
        return []
    
    logger.info(f"Fetching events from sections: {section_ids}")
    try:
        data = {"sectionIds": section_ids}
        response = requests.post(KYN_SECTIONS_URL, headers=HEADERS, json=data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            sections = result.get("data", [])
            for section in sections:
                section_events = section.get("data")
                if section_events and isinstance(section_events, list):
                    logger.info(f"Found {len(section_events)} events in section '{section.get('sectionName')}'")
                    all_events.extend(section_events)
                else:
                    logger.warning(f"No events found in section '{section.get('sectionName')}' (ID: {section.get('sectionId')})")
        else:
            logger.error(f"Failed to fetch sections: {response.status_code} - {response.text[:200]}")
    except Exception as e:
        logger.error(f"Error fetching sections: {e}")
    
    return all_events

def fetch_general_events(limit=50) -> List[Dict[str, Any]]:
    """Fetches a general list of events from Kynhood."""
    logger.info(f"Fetching general events...")
    try:
        response = requests.get(KYN_EVENTS_URL, headers=HEADERS, timeout=30)
        if response.status_code == 200:
            result = response.json()
            events = result.get("data", [])
            logger.info(f"Fetched {len(events)} general events.")
            return events
        else:
            logger.error(f"Failed to fetch general events: {response.status_code}")
    except Exception as e:
        logger.error(f"Error fetching general events: {e}")
    return []

def map_to_local_schema(kyn_event: Dict[str, Any]) -> Dict[str, Any]:
    """Maps Kynhood event structure to a flat dictionary for API and local schema."""
    
    # Map category
    category_map = {
        "kids": "OTHER",
        "music": "MUSIC",
        "sports": "SPORTS",
        "workshops": "WORKSHOP",
        "comedy": "COMEDY",
        "theatre": "THEATRE"
    }
    raw_category = kyn_event.get("category", "").lower()
    category = category_map.get(raw_category, "OTHER")
    
    # Handle dates
    start_at_str = kyn_event.get("startsAt") or kyn_event.get("startDate")
    end_at_str = kyn_event.get("endsAt") or kyn_event.get("endDate")
    
    # Kynhood sometimes uses ISO strings with 'Z', we need to ensure they are compatible
    # The main backend expects ISO format. 
    # Let's ensure we have a valid ISO string.
    def format_date(date_str):
        if not date_str:
            return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z")
        # If it's already in a good format, just return it
        # Otherwise, try to parse it
        try:
            # Main backend z.string().datetime() requires specific format (often ISO with Z)
            # Kynhood usually provides "2026-06-20T23:30:41.000Z"
            if "T" in date_str:
                # Ensure it has milliseconds and Z
                if "." not in date_str:
                    date_str = date_str.replace("Z", ".000Z")
                if not date_str.endswith("Z") and "+00:00" not in date_str:
                    date_str += "Z"
                return date_str
            
            # If it's just a date without time, add default time
            return f"{date_str}T00:00:00.000Z"
        except:
            return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z")

    start_at = format_date(start_at_str)
    end_at = format_date(end_at_str)
    
    # Location/City
    locations = kyn_event.get("locations", [])
    primary_location = locations[0] if locations else {}
    location_data = primary_location.get("location") or kyn_event.get("location") or {}
    
    city = location_data.get("value", "Chennai")
    venue = primary_location.get("venue") or kyn_event.get("venue", "Various")
    address_line = primary_location.get("locationTag") or location_data.get("value")
    
    # Images
    images = []
    banner_url = None
    event_images = kyn_event.get("eventImages") or {}
    event_assets = kyn_event.get("eventAssets") or {}
    
    # Try banner from eventImages
    banners = event_images.get("bannerUrl", [])
    if banners:
        banner_url = banners[0]
        images.append(banner_url)
    
    # Try banner from eventAssets if still None
    if not banner_url:
        banners_assets = event_assets.get("banner", [])
        if banners_assets and isinstance(banners_assets, list):
            banner_url = banners_assets[0].get("processed_url")
            if banner_url:
                images.append(banner_url)

    # Try thumbnails from eventImages
    thumbnails = event_images.get("thumbnailUrl", [])
    for thumb in thumbnails:
        if thumb not in images:
            images.append(thumb)
            
    # Try thumbnails from eventAssets
    thumbnails_assets = event_assets.get("thumbnail", [])
    if thumbnails_assets and isinstance(thumbnails_assets, list):
        for asset in thumbnails_assets:
            thumb = asset.get("processed_url")
            if thumb and thumb not in images:
                images.append(thumb)

    # Prices
    price = int(kyn_event.get("price") or 0)

    # Extract Latitude and Longitude from locationUrl
    latitude = None
    longitude = None
    location_url = primary_location.get("locationUrl")
    if location_url:
        try:
            # Handle Google Maps search/query URL
            if "query=" in location_url:
                parsed_url = urlparse(location_url)
                params = parse_qs(parsed_url.query)
                query_param = params.get("query", [])
                if query_param:
                    # Expected format: "lat,lng"
                    coords_match = re.search(r'(-?\d+\.\d+),(-?\d+\.\d+)', query_param[0])
                    if coords_match:
                        latitude = float(coords_match.group(1))
                        longitude = float(coords_match.group(2))
            
            # Handle short URLs or other formats (XP8pSsk5T29ydS0fk doesn't contain coords in URL)
            # If we couldn't get it from the query, we might need a more complex solution
            # but for now, we'll try to find any coordinates in the URL
            if latitude is None:
                coords_match = re.search(r'(-?\d+\.\d+),(-?\d+\.\d+)', location_url)
                if coords_match:
                    latitude = float(coords_match.group(1))
                    longitude = float(coords_match.group(2))
                    
            if latitude is not None:
                logger.debug(f"Extracted coordinates: {latitude}, {longitude} from {location_url}")
        except Exception as e:
            logger.warning(f"Failed to extract coordinates from {location_url}: {e}")

    # Ticket Types (Mocking a default one as it's required by our backend)
    ticket_types = [
        {
            "name": "General Admission",
            "description": "Standard entry",
            "priceCents": price
        }
    ]

    return {
        "id": kyn_event["eventId"],
        "title": kyn_event["name"],
        "description": kyn_event.get("description") or kyn_event["name"],
        "category": category,
        "venue": venue,
        "addressLine": address_line,
        "city": city,
        "state": "Tamil Nadu",
        "country": "IN",
        "latitude": latitude,
        "longitude": longitude,
        "startAt": start_at,
        "endAt": end_at,
        "priceCents": price,
        "currency": "INR",
        "capacity": 1000, # Default capacity
        "status": "PUBLISHED",
        "organizerId": ORGANIZATION_ID,
        "bannerUrl": banner_url,
        "images": images,
        "ticketTypes": ticket_types
    }

def verify_auth_token() -> bool:
    """Verifies if the AUTH_TOKEN is valid and has sufficient permissions."""
    if not AUTH_TOKEN or AUTH_TOKEN == "REPLACE_WITH_YOUR_TOKEN":
        logger.error("AUTH_TOKEN is not set. Please update the script or set the MAIN_BACKEND_AUTH_TOKEN environment variable.")
        return False
        
    logger.info("Verifying AUTH_TOKEN...")
    try:
        headers = {
            "Authorization": f"Bearer {AUTH_TOKEN}"
        }
        response = requests.get(LOCAL_BACKEND_MINE_URL, headers=headers, timeout=10)
        if response.status_code == 200:
            logger.info("AUTH_TOKEN verified successfully.")
            return True
        elif response.status_code == 401:
            logger.error("AUTH_TOKEN verification failed: 401 - Unauthorized. Your token might be expired or invalid.")
        elif response.status_code == 403:
            logger.error("AUTH_TOKEN verification failed: 403 - Forbidden. You might not have the ORGANIZER or ADMIN role.")
        else:
            logger.error(f"AUTH_TOKEN verification failed: {response.status_code} - {response.text[:200]}")
    except Exception as e:
        logger.error(f"Error verifying AUTH_TOKEN: {e}")
    
    return False

def sync_events():
    # 0. Verify Auth
    if not verify_auth_token():
        logger.error("Stopping sync due to authentication failure.")
        logger.info("-" * 50)
        logger.info("HOW TO GET A VALID AUTH_TOKEN:")
        logger.info("1. Open your browser and go to your local EventHub website.")
        logger.info("2. Log in as an Organizer or Admin.")
        logger.info("3. Open Developer Tools (F12 or Cmd+Opt+I).")
        logger.info("4. Go to the 'Application' tab -> 'Local Storage' -> http://localhost:5173.")
        logger.info("5. Find the 'auth_token' or similar key.")
        logger.info("6. Set it as an environment variable: export MAIN_BACKEND_AUTH_TOKEN=\"your_token_here\"")
        logger.info("-" * 50)
        return

    # 1. Fetch data
    events_from_sections = fetch_events_from_sections(SECTION_IDS)
    general_events = fetch_general_events(limit=50)
    
    # Combine and deduplicate by eventId
    combined_raw = {e["eventId"]: e for e in (events_from_sections + general_events)}
    logger.info(f"Total unique events found: {len(combined_raw)}")
    
    if not combined_raw:
        logger.info("No events to sync.")
        return

    # 2. Map to local schema
    local_events = []
    for eid, k_event in combined_raw.items():
        try:
            local_events.append(map_to_local_schema(k_event))
        except Exception as e:
            logger.error(f"Error mapping event {eid}: {e}")
    
    logger.info(f"Successfully mapped {len(local_events)} events.")
    
    if not local_events:
        return

    # 3. Ingest into Postgress (Local Backend)
    logger.info("Starting ingestion into Postgress (Local Backend)...")
    ingested_to_pg = 0
    for event_data in local_events:
        try:
            # Prepare data for Postgres (remove ID as Postgres generates it, or keep if supported)
            # Based on events.service.ts, the 'create' method takes organizerId separately.
            pg_payload = event_data.copy()
            # The backend expects CreateEventInput which doesn't have ID or organizerId in body
            pg_payload.pop("id", None)
            pg_payload.pop("organizerId", None)
            
            # Use the verified AUTH_TOKEN
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {AUTH_TOKEN}"
            }
            
            response = requests.post(LOCAL_BACKEND_CREATE_URL, json=pg_payload, headers=headers, timeout=10)
            if response.status_code in [200, 201]:
                logger.info(f"Successfully ingested event '{event_data['title']}' into Postgres.")
                ingested_to_pg += 1
            elif response.status_code == 401:
                logger.error(f"Failed to ingest event '{event_data['title']}' into Postgres: 401 - Unauthorized. Your AUTH_TOKEN might be expired.")
                logger.error("Please update the AUTH_TOKEN in the script or set the MAIN_BACKEND_AUTH_TOKEN environment variable.")
                # If we get a 401, subsequent requests will likely also fail, so we could break here
                logger.warning("Stopping Postgres ingestion due to authentication failure.")
                break
            else:
                logger.error(f"Failed to ingest event '{event_data['title']}' into Postgres: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            logger.error(f"Error ingesting into Postgres: {e}")

    logger.info(f"Successfully ingested {ingested_to_pg} events into Postgres.")

    # 4. Ingest into Qdrant (AI Backend)
    # Note: If the Main Backend ingestion was successful, it might have already pushed to Qdrant
    # via aiSearchService.upsertEvent. However, doing it here ensures consistency and handles
    # cases where the Main Backend call failed but we still want the data in Qdrant.
    logger.info("Starting ingestion into Qdrant...")
    try:
        # Convert back to EventPayload objects for IngestionService
        payload_events = []
        for e in local_events:
            # Fix dates back to datetime objects for Pydantic
            e_fixed = e.copy()
            e_fixed["startAt"] = datetime.fromisoformat(e["startAt"])
            e_fixed["endAt"] = datetime.fromisoformat(e["endAt"])
            
            # Map images back to EventImagePayload
            img_payloads = []
            for idx, url in enumerate(e["images"]):
                img_payloads.append(EventImagePayload(url=url, position=idx))
            e_fixed["images"] = img_payloads
            
            # Organizer ID normalization (schema might use organizerId or organizer_id)
            if "organizerId" in e_fixed:
                e_fixed["organizer_id"] = e_fixed["organizerId"]

            # Remove ticketTypes from Pydantic if not in schema (it is in schema now or we use dict)
            # Actually, let's keep only fields present in EventPayload to avoid validation errors
            if hasattr(EventPayload, "model_fields"):
                valid_fields = EventPayload.model_fields.keys()
            else:
                valid_fields = EventPayload.__fields__.keys()
            filtered_e = {k: v for k, v in e_fixed.items() if k in valid_fields}
            payload_events.append(EventPayload(**filtered_e))

        settings = get_settings()
        embeddings = build_embeddings(settings)
        factory = VectorStoreFactory(settings, embeddings)
        ingestion_service = IngestionService(factory)
        
        count = ingestion_service.upsert_events(payload_events)
        logger.info(f"Successfully ingested {count} events into local Qdrant collection '{settings.qdrant_collection}'.")
        
        # Also save raw data for reference
        with open("kyn_last_sync_raw.json", "w") as f:
            json.dump(list(combined_raw.values()), f, indent=2)
            
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")

if __name__ == "__main__":
    sync_events()
