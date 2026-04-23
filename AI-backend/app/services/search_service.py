from langchain_openai import ChatOpenAI
from qdrant_client import models as qdrant_models

from app.core.config import Settings
from app.models.schemas import SearchRequest, SearchResponse, SearchResult
from app.services.vector_store import VectorStoreFactory


class SearchService:
    def __init__(self, settings: Settings, vector_store_factory: VectorStoreFactory) -> None:
        self.settings = settings
        self.vector_store = vector_store_factory.build()
        self.llm = (
            ChatOpenAI(api_key=settings.openai_api_key, model="gpt-4o-mini", temperature=0)
            if settings.openai_api_key
            else None
        )

    def _build_filter(self, request: SearchRequest) -> qdrant_models.Filter | None:
        conditions: list[qdrant_models.FieldCondition] = []

        if request.filters and request.filters.status:
            conditions.append(
                qdrant_models.FieldCondition(
                    key="metadata.status",
                    match=qdrant_models.MatchValue(value=request.filters.status),
                )
            )
        if request.filters and request.filters.city:
            conditions.append(
                qdrant_models.FieldCondition(
                    key="metadata.city",
                    match=qdrant_models.MatchValue(value=request.filters.city),
                )
            )
        if request.filters and request.filters.category:
            conditions.append(
                qdrant_models.FieldCondition(
                    key="metadata.category",
                    match=qdrant_models.MatchValue(value=request.filters.category.upper()),
                )
            )

        if not conditions:
            return None

        return qdrant_models.Filter(must=conditions)

    def _generate_answer(self, query: str, results: list[SearchResult], user_lat: float | None = None, user_lon: float | None = None) -> str | None:
        if not self.llm or not results:
            return None

        context_parts = []
        for i, res in enumerate(results[:5]):
            loc_info = f"at {res.venue}, {res.city}"
            if res.latitude and res.longitude and user_lat and user_lon:
                if abs(res.latitude) > 0.0001 or abs(res.longitude) > 0.0001:
                    # Basic distance calculation (not precise but enough for context)
                    dist = ((res.latitude - user_lat)**2 + (res.longitude - user_lon)**2)**0.5 * 111 # rough km
                    loc_info += f" (approx {dist:.1f} km from you)"

            context_parts.append(
                f"[{i+1}] {res.title} {loc_info}. "
                f"Starts: {res.start_at}. Price: {res.price_cents/100} {res.currency}. "
                f"Description: {res.description[:300]}"
            )
        context = "\n".join(context_parts)

        prompt = f"""You are an elite AI event assistant for EventHub. 
A user asked: "{query}"

Based on the search results below, provide a highly informative, advanced, and slightly creative/engaging (but accurate) summary.
Compare the events with the user's location if provided.
Highlight specific details like venue, time, and why these events are worth attending.

Search Results:
{context}

User's Location: {f'Lat {user_lat}, Lon {user_lon}' if user_lat else 'Not provided'}

Answer:"""
        try:
            response = self.llm.invoke(prompt)
            return str(response.content)
        except Exception:
            return None

    def _enrich_results_with_ai(self, query: str, results: list[SearchResult], user_lat: float | None = None, user_lon: float | None = None) -> None:
        if not self.llm or not results:
            return

        # We enrich the top 5 results to ensure the most relevant ones are covered
        for res in results[:5]:
            loc_context = ""
            if res.latitude and res.longitude and user_lat and user_lon:
                if abs(res.latitude) > 0.0001 or abs(res.longitude) > 0.0001:
                    dist = ((res.latitude - user_lat)**2 + (res.longitude - user_lon)**2)**0.5 * 111
                    loc_context = f"This event is about {dist:.1f} km from your current location."
            
            prompt = f"""As an AI concierge, explain why the event '{res.title}' matches the query '{query}'. 
Provide a sophisticated, informative, and slightly visionary explanation of what the user can expect. 
Feel free to creatively expand on the event's potential highlights and overall experience based on its description, 
making it sound like a premium, must-attend occasion. 
Make it sound enterprise-level and modern. Mention its location: {res.venue}, {res.city}.

Explanation:"""
            try:
                response = self.llm.invoke(prompt)
                res.ai_explanation = str(response.content)
                res.location_context = loc_context
            except Exception:
                continue

    def _preprocess_query(self, query: str) -> tuple[str, bool]:
        # Remove "near me" and common fillers that dilute vector search
        fillers = ["near me", "around me", "nearby", "close to me"]
        processed = query.lower()
        
        # Detect if user is looking for free events
        is_free_query = "free" in processed
        if is_free_query:
            # We don't necessarily want to remove "free" as it's a strong semantic signal,
            # but we can remove it if it helps vector search focus on the event type.
            # For now, let's keep it but flag it.
            pass

        for filler in fillers:
            processed = processed.replace(filler, "")
        
        return processed.strip() or query, is_free_query

    def search(self, request: SearchRequest) -> SearchResponse:
        processed_query, is_free_query = self._preprocess_query(request.query)
        
        # Use a larger k for initial search to allow for re-ranking
        initial_k = (request.top_k or self.settings.search_top_k) * 2
        
        results = self.vector_store.similarity_search_with_score(
            query=processed_query,
            k=initial_k,
            filter=self._build_filter(request),
        )

        items = [
            SearchResult(
                event_id=document.metadata["event_id"],
                id=document.metadata["id"],
                title=document.metadata["title"],
                description=document.metadata["description"],
                city=document.metadata["city"],
                category=document.metadata["category"],
                venue=document.metadata["venue"],
                address_line=document.metadata.get("address_line"),
                state=document.metadata.get("state"),
                country=document.metadata.get("country"),
                latitude=document.metadata.get("latitude"),
                longitude=document.metadata.get("longitude"),
                start_at=document.metadata["start_at"],
                end_at=document.metadata["end_at"],
                price_cents=document.metadata["price_cents"],
                currency=document.metadata["currency"],
                status=document.metadata["status"],
                banner_url=document.metadata.get("banner_url"),
                image_urls=document.metadata.get("image_urls", []),
                ticket_types=document.metadata.get("ticket_types", []),
                sentiment=document.metadata.get("sentiment", "balanced"),
                category_summary=document.metadata.get("category_summary", ""),
                semantic_tags=document.metadata.get("semantic_tags", []),
                organizer_id=document.metadata.get("organizer_id"),
                score=float(score),
                metadata=document.metadata,
            )
            for document, score in results
        ]

        # Apply boosts
        for item in items:
            # Price boost: if it's a free query and price is 0, give a significant boost
            if is_free_query and item.price_cents == 0:
                item.score += 0.8  # Strong boost for free events when requested
            
            # Distance boost: if location is provided
            if request.latitude is not None and request.longitude is not None:
                user_lat, user_lon = request.latitude, request.longitude
                if item.latitude and item.longitude and (abs(item.latitude) > 0.0001 or abs(item.longitude) > 0.0001):
                    dist = ((item.latitude - user_lat)**2 + (item.longitude - user_lon)**2)**0.5 * 111
                    # Give a boost to closer items. 
                    distance_boost = 1.0 / (1.0 + dist/10.0) # Boost decays over 10km
                    item.score += distance_boost * 0.5 # Weight of distance boost is 0.5
                
        # Sort by final boosted score
        items.sort(key=lambda x: x.score, reverse=True)

        # Truncate to requested top_k
        items = items[:(request.top_k or self.settings.search_top_k)]

        # Enrich the results and generate answer
        self._enrich_results_with_ai(request.query, items, request.latitude, request.longitude)
        
        # After enrichment, we might have set location_context on items. 
        # But wait, items is a list of SearchResult objects which are Pydantic models.
        # Let's make sure the location_context is actually being set and returned.
        
        answer = self._generate_answer(request.query, items, request.latitude, request.longitude)

        return SearchResponse(query=request.query, answer=answer, count=len(items), results=items)
