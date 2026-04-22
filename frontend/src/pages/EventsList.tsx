import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Filter } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  const [city, setCity] = useState<string>('');
  const [category, setCategory] = useState<EventCategory | ''>('');
  const [q, setQ] = useState('');

  const citiesQ = useQuery({ queryKey: ['cities'], queryFn: () => eventsApi.cities() });

  const params = useMemo(
    () => ({
      city: city || undefined,
      category: (category || undefined) as EventCategory | undefined,
      q: q || undefined,
      page: 1,
      pageSize: 24,
    }),
    [city, category, q],
  );

  const eventsQ = useQuery({
    queryKey: ['events', params],
    queryFn: () => eventsApi.list(params),
  });

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-600 to-indigo-500 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Discover events near you.
          </h1>
          <p className="text-brand-50 mb-8 text-lg">
            Concerts, games, conferences, festivals — all in one place.
          </p>
          <div className="card p-2 text-slate-900 grid grid-cols-1 md:grid-cols-[1fr_200px_200px_auto] gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="input pl-9"
                placeholder="Search events, artists, venues"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                className="input pl-9"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
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
            <button className="btn-primary md:w-auto">Search</button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {city ? `Events in ${city}` : 'Upcoming events'}
          </h2>
          <span className="text-sm text-slate-500">
            {eventsQ.data?.total ?? 0} result{(eventsQ.data?.total ?? 0) === 1 ? '' : 's'}
          </span>
        </div>

        {eventsQ.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-80 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : (eventsQ.data?.items.length ?? 0) === 0 ? (
          <div className="card p-10 text-center text-slate-500">
            No events match your filters. Try a different city or category.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {eventsQ.data!.items.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
