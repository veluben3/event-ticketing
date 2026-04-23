import { Link } from 'react-router-dom';
import { MapPin, CalendarDays, Tag } from 'lucide-react';
import { format } from 'date-fns';
import type { AiSearchEventDto, EventDto } from '../types';

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
      cents / 100,
    );
  } catch {
    return `${currency} ${(cents / 100).toFixed(0)}`;
  }
}

const placeholder =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 220'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%25' stop-color='%23818cf8'/><stop offset='100%25' stop-color='%236366f1'/></linearGradient></defs><rect width='400' height='220' fill='url(%23g)'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='22' fill='white' opacity='0.9'>EventHub</text></svg>";

export default function EventCard({ event }: { event: EventDto }) {
  const aiEvent = event as AiSearchEventDto;
  const hasAiMeta = typeof aiEvent.score === 'number';

  return (
    <Link
      to={`/events/${event.id}`}
      className="card overflow-hidden flex flex-col hover:shadow-lg transition group"
    >
      <div className="h-44 bg-slate-100 overflow-hidden">
        <img
          src={event.bannerUrl ?? event.images?.[0]?.url ?? placeholder}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition"
          onError={(e) => ((e.target as HTMLImageElement).src = placeholder)}
        />
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
            <Tag size={12} /> {event.category}
          </span>
          {hasAiMeta && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
              AI match
            </span>
          )}
          <span className="text-slate-500">{format(new Date(event.startAt), 'MMM d, yyyy')}</span>
        </div>
        <h3 className="font-semibold text-slate-900 line-clamp-2">{event.title}</h3>
        {hasAiMeta && (
          <p className="text-xs text-slate-500 line-clamp-2">
            {aiEvent.categorySummary} · {aiEvent.sentiment}
          </p>
        )}
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <MapPin size={14} className="text-slate-400" />
          <span className="truncate">
            {event.venue}, {event.city}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <CalendarDays size={14} className="text-slate-400" />
          {format(new Date(event.startAt), 'EEE, h:mm a')}
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-900">
            {formatPrice(event.priceCents, event.currency)}
          </div>
          <span className="text-xs text-slate-500">
            {event.capacity - event.ticketsSold} left
          </span>
        </div>
      </div>
    </Link>
  );
}
