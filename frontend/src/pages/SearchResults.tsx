import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Tag, Sparkles, ArrowLeft, Info } from 'lucide-react';
import { eventsApi } from '../api/endpoints';
import { format } from 'date-fns';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const city = searchParams.get('city') || '';
  const category = searchParams.get('category') || '';
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['semantic-search', { q, city, category, lat, lng }],
    queryFn: () => eventsApi.semanticSearch({ q, city, category, lat, lng, topK: 24 }),
    enabled: q.length > 0,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
        <p className="text-slate-500 text-lg">AI is analyzing events for you...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to search</span>
          </Link>
          <div className="text-sm text-slate-500 font-medium">
            {data?.total ?? 0} enterprise search results for "{q}"
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {data?.answer && (
          <div className="mb-12 card p-8 bg-indigo-600 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <Sparkles size={120} />
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={24} className="text-indigo-200" />
                <h2 className="text-xl font-bold">AI Intelligence Summary</h2>
              </div>
              <p className="text-xl leading-relaxed italic text-indigo-50">
                &ldquo;{data.answer}&rdquo;
              </p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {data?.items.map((event) => (
            <div key={event.id} className="card overflow-hidden grid grid-cols-1 md:grid-cols-[300px_1fr] group hover:shadow-lg transition-shadow">
              <div className="h-64 md:h-full relative overflow-hidden">
                <img
                  src={event.bannerUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80'}
                  alt={event.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-bold text-indigo-600 uppercase tracking-wider shadow-sm">
                    {event.category}
                  </span>
                </div>
              </div>

              <div className="p-6 md:p-8 flex flex-col">
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {event.title}
                    </h3>
                    <div className="text-right">
                      <div className="text-2xl font-black text-indigo-600">
                        {event.priceCents / 100} <span className="text-sm font-normal text-slate-500">{event.currency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-slate-500 mb-6">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={16} className="text-slate-400" />
                      {format(new Date(event.startAt), 'PPP p')}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={16} className="text-slate-400" />
                      {event.venue}, {event.city}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tag size={16} className="text-slate-400" />
                      {event.sentiment} vibe
                    </div>
                  </div>

                  {event.aiExplanation ? (
                    <div className="bg-slate-100 rounded-xl p-5 mb-6 relative">
                      <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold text-sm uppercase tracking-widest">
                        <Sparkles size={14} />
                        AI Insight
                      </div>
                      <p className="text-slate-700 leading-relaxed italic">
                        {event.aiExplanation}
                      </p>
                      {event.locationContext && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <MapPin size={12} />
                          {event.locationContext}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-600 line-clamp-3 mb-6 leading-relaxed">
                      {event.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100">
                  <div className="flex -space-x-2">
                    {event.semanticTags?.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-400 uppercase">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <Link
                    to={`/events/${event.id}`}
                    className="btn-primary px-8"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {(!data || data.items.length === 0) && (
            <div className="text-center py-20 card bg-white">
              <Info size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No accurate matches found</h3>
              <p className="text-slate-500">
                Our AI couldn't find an exact match for your enterprise search. Try broadening your query or checking other cities.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
