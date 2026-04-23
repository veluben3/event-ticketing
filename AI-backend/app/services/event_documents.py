from langchain_core.documents import Document

from app.models.schemas import EventPayload

POSITIVE_KEYWORDS = {
    "music",
    "festival",
    "party",
    "celebration",
    "award",
    "vip",
    "fun",
    "family",
    "comedy",
    "workshop",
    "networking",
    "premium",
}

CALM_KEYWORDS = {
    "theatre",
    "classical",
    "mindful",
    "seminar",
    "conference",
    "panel",
    "talk",
}

SPORT_KEYWORDS = {
    "sports",
    "match",
    "game",
    "stadium",
    "tournament",
}


def derive_sentiment(event: EventPayload) -> str:
    text = f"{event.title} {event.description}".lower()
    positive_hits = sum(1 for word in POSITIVE_KEYWORDS if word in text)
    calm_hits = sum(1 for word in CALM_KEYWORDS if word in text)
    sport_hits = sum(1 for word in SPORT_KEYWORDS if word in text)

    if sport_hits >= 2:
        return "energetic"
    if positive_hits >= 2:
        return "exciting"
    if calm_hits >= 2:
        return "thoughtful"
    return "balanced"


def derive_category_summary(event: EventPayload) -> str:
    mapping = {
        "MUSIC": "live music and performance experience",
        "SPORTS": "competitive sports and crowd energy",
        "CONFERENCE": "professional learning and networking experience",
        "THEATRE": "stage performance and storytelling experience",
        "FESTIVAL": "large-scale celebration and entertainment experience",
        "COMEDY": "humor-driven live performance experience",
        "WORKSHOP": "hands-on guided learning experience",
        "OTHER": "special interest curated event experience",
    }
    return mapping.get(event.category, "curated event experience")


def derive_semantic_tags(event: EventPayload) -> list[str]:
    tags = {
        event.category.lower(),
        event.city.lower(),
        event.venue.lower(),
        derive_sentiment(event),
    }

    for ticket in event.ticketTypes:
        tags.add(ticket.name.lower())
        if ticket.description:
            for token in ticket.description.lower().split():
                if len(token) > 4:
                    tags.add(token.strip(",."))

    for token in f"{event.title} {event.description}".lower().split():
        if len(token) > 5:
            tags.add(token.strip(",."))

    return sorted(tags)


def build_event_text(event: EventPayload) -> str:
    sentiment = derive_sentiment(event)
    category_summary = derive_category_summary(event)
    semantic_tags = ", ".join(derive_semantic_tags(event)[:20])
    image_summary = ", ".join([image.url for image in event.images]) or (event.bannerUrl or "no image")
    ticket_summary = "; ".join(
        [
            f"{ticket.name}: {ticket.description or 'standard access'} priced at {ticket.priceCents / 100:.2f} {event.currency}"
            for ticket in event.ticketTypes
        ]
    )

    parts = [
        f"Event title: {event.title}",
        f"Event category: {event.category}",
        f"Category meaning: {category_summary}",
        f"Sentiment and vibe: {sentiment}",
        f"Description: {event.description}",
        f"Venue: {event.venue}",
        f"Address line: {event.addressLine or 'not provided'}",
        f"City: {event.city}",
        f"State: {event.state or 'N/A'}",
        f"Country: {event.country or 'IN'}",
        f"Coordinates: latitude {event.latitude if event.latitude is not None else 'N/A'}, longitude {event.longitude if event.longitude is not None else 'N/A'}",
        f"Starts at: {event.startAt.isoformat()}",
        f"Ends at: {event.endAt.isoformat()}",
        f"Status: {event.status}",
        f"Base price: {event.priceCents / 100:.2f} {event.currency}",
        f"Ticket types: {ticket_summary or 'No ticket type details provided'}",
        f"Primary image: {event.bannerUrl or 'not provided'}",
        f"Related image URLs: {image_summary}",
        f"Semantic tags: {semantic_tags}",
    ]
    return "\n".join(parts)


def build_event_document(event: EventPayload) -> Document:
    sentiment = derive_sentiment(event)
    category_summary = derive_category_summary(event)
    semantic_tags = derive_semantic_tags(event)
    image_urls = [image.url for image in sorted(event.images, key=lambda image: image.position)]

    return Document(
        id=event.id,
        page_content=build_event_text(event),
        metadata={
            "event_id": event.id,
            "id": event.id,
            "organizer_id": event.organizerId,
            "title": event.title,
            "description": event.description,
            "city": event.city,
            "category": event.category,
            "venue": event.venue,
            "address_line": event.addressLine,
            "state": event.state,
            "country": event.country,
            "latitude": event.latitude,
            "longitude": event.longitude,
            "status": event.status,
            "start_at": event.startAt.isoformat(),
            "end_at": event.endAt.isoformat(),
            "price_cents": event.priceCents,
            "currency": event.currency,
            "capacity": event.capacity,
            "tickets_sold": event.ticketsSold,
            "banner_url": event.bannerUrl,
            "image_urls": image_urls,
            "ticket_types": [ticket.model_dump() for ticket in event.ticketTypes],
            "ticket_type_names": [ticket.name for ticket in event.ticketTypes],
            "sentiment": sentiment,
            "category_summary": category_summary,
            "semantic_tags": semantic_tags,
        },
    )
