import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Filter, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../api/endpoints';
import EventCard from '../components/EventCard';
import type { EventCategory } from '../types';

const CATEGORIES: { value: EventCategory | ''; label: string }[] = [
  { value: '', label: 'All categories' },
  { value: 'MUSIC', label: 'Music' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'CONFERENCE', label: 'Conference' },
  { value: 'THEATRE', label: 'Theatre' },
  { value: 'FESTIVAL', label: 'Festival' },
  { value: 'COMEDY', label: 'Comedy' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'OTHER', label: 'Other' },
];

export default function EventsListPage() {
  const navigate = useNavigate();
  const [city, setCity] = useState<string>('');
  const [category, setCategory] = useState<EventCategory | ''>('');
  const [q, setQ] = useState('');
  const [submittedQ, setSubmittedQ] = useState('');

  const isAiSearch = false; // We now redirect to SearchResultsPage

  const citiesQ = useQuery({ queryKey: ['cities'], queryFn: () => eventsApi.cities() });

  const browseParams = useMemo(
    () => ({
      city: city || undefined,
      category: (category || undefined) as EventCategory | undefined,
      page: 1,
      pageSize: 24,
    }),
    [city, category],
  );

  const aiParams = useMemo(
    () => ({
      q: submittedQ,
      city: city || undefined,
      category: (category || undefined) as EventCategory | undefined,
      topK: 24,
    }),
    [submittedQ, city, category],
  );

  const browseEventsQ = useQuery({
    queryKey: ['events', browseParams],
    queryFn: () => eventsApi.list(browseParams),
    enabled: !isAiSearch,
  });

  const aiEventsQ = useQuery({
    queryKey: ['events-ai', aiParams],
    queryFn: () => eventsApi.semanticSearch(aiParams),
    enabled: isAiSearch,
  });

  const activeQuery = isAiSearch ? aiEventsQ : browseEventsQ;

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-600 to-indigo-500 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Discover events near you.</h1>
          <p className="text-brand-50 mb-8 text-lg">
            Concerts, games, conferences, festivals — all in one place.
          </p>
          <form
            className="card p-2 text-slate-900 grid grid-cols-1 md:grid-cols-[1fr_200px_200px_auto] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) {
                const params = new URLSearchParams({ q: q.trim() });
                if (city) params.append('city', city);
                if (category) params.append('category', category);
                
                // Try to get location
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      params.append('lat', pos.coords.latitude.toString());
                      params.append('lng', pos.coords.longitude.toString());
                      navigate(`/search?${params.toString()}`);
                    },
                    () => {
                      navigate(`/search?${params.toString()}`);
                    },
                    { timeout: 3000 }
                  );
                } else {
                  navigate(`/search?${params.toString()}`);
                }
              }
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="input pl-9"
                placeholder="Ask AI anything about events, vibes, prices, family shows, workshops..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select className="input pl-9" value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">All cities</option>
                {(citiesQ.data ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                className="input pl-9"
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary md:w-auto" type="submit">
              <Sparkles size={16} />
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {isAiSearch
                ? `AI search results for "${submittedQ}"`
                : city
                  ? `Events in ${city}`
                  : 'Upcoming events'}
            </h2>
            {isAiSearch && (
              <p className="text-sm text-slate-500 mt-1">
                Semantic search uses title, description, location, images, ticket details, sentiment, and category meaning.
              </p>
            )}
          </div>
          <span className="text-sm text-slate-500">
            {activeQuery.data?.total ?? 0} result{(activeQuery.data?.total ?? 0) === 1 ? '' : 's'}
          </span>
        </div>

        {isAiSearch && activeQuery.data?.answer && (
          <div className="mb-10 card p-6 bg-indigo-50 border-indigo-100 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles size={80} className="text-indigo-600" />
            </div>
            <div className="flex items-start gap-4 relative">
              <div className="bg-indigo-600 p-2 rounded-lg text-white mt-1 shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-indigo-900 font-bold text-lg mb-2">AI Summary</h3>
                <p className="text-indigo-800 leading-relaxed text-lg italic">
                  &ldquo;{activeQuery.data.answer}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {activeQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-80 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : (activeQuery.data?.items.length ?? 0) === 0 ? (
          <div className="card p-10 text-center text-slate-500">
            {isAiSearch
              ? 'AI search could not find a close event match. Try another phrase, city, or category.'
              : 'No events match your filters. Try a different city or category.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {activeQuery.data!.items.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
