import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { CalendarDays, MapPin, Users, Ticket as TicketIcon, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { eventsApi, ticketsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

export default function EventDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);

  const eventQ = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id),
    enabled: !!id,
  });

  const purchaseMut = useMutation({
    mutationFn: () =>
      ticketsApi.purchase({ eventId: id, quantity: qty }, crypto.randomUUID()),
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ['event', id] });
      navigate(`/checkout/${ticket.id}`);
    },
  });

  if (eventQ.isLoading) {
    return <div className="p-10 text-center text-slate-500">Loading…</div>;
  }
  if (!eventQ.data) {
    return <div className="p-10 text-center text-slate-500">Event not found</div>;
  }
  const event = eventQ.data;
  const isOwner = user && (user.role === 'ADMIN' || user.id === event.organizerId);
  const available = event.capacity - event.ticketsSold;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="card overflow-hidden">
        <div className="h-64 sm:h-80 bg-gradient-to-br from-brand-400 to-brand-700">
          {event.bannerUrl && (
            <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium">
                {event.category}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{event.title}</h1>
              <div className="flex items-center gap-2 mt-2 text-slate-600">
                <Building2 size={16} />
                <span className="text-sm">
                  {event.organizer?.companyName ?? event.organizer?.name ?? 'Organizer'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-slate-900">
                {formatPrice(event.priceCents, event.currency)}
              </div>
              <div className="text-sm text-slate-500">per ticket</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <InfoRow icon={<CalendarDays size={16} />} title="Starts">
              {format(new Date(event.startAt), 'PPP p')}
            </InfoRow>
            <InfoRow icon={<MapPin size={16} />} title="Venue">
              {event.venue}, {event.city}
              {event.state ? `, ${event.state}` : ''}
            </InfoRow>
            <InfoRow icon={<Users size={16} />} title="Availability">
              {available} of {event.capacity} left
            </InfoRow>
          </div>

          <p className="mt-6 text-slate-700 whitespace-pre-line leading-relaxed">
            {event.description}
          </p>

          <div className="border-t border-slate-200 mt-8 pt-6 flex flex-wrap items-center gap-4">
            {isOwner ? (
              <button className="btn-secondary" onClick={() => navigate('/organizer')}>
                View organizer dashboard
              </button>
            ) : event.status !== 'PUBLISHED' ? (
              <div className="text-sm text-slate-500">
                This event is currently {event.status.toLowerCase()}.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">Tickets</label>
                  <input
                    type="number"
                    min={1}
                    max={Math.min(10, available)}
                    className="input w-20"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                  />
                </div>
                <div className="text-slate-700">
                  Total:{' '}
                  <span className="font-semibold">
                    {formatPrice(event.priceCents * qty, event.currency)}
                  </span>
                </div>
                <button
                  className="btn-primary ml-auto"
                  disabled={!user || available === 0 || purchaseMut.isPending}
                  onClick={() => {
                    if (!user) {
                      navigate('/login');
                      return;
                    }
                    purchaseMut.mutate();
                  }}
                >
                  <TicketIcon size={16} />
                  {available === 0
                    ? 'Sold out'
                    : purchaseMut.isPending
                      ? 'Processing…'
                      : user
                        ? 'Buy ticket'
                        : 'Sign in to buy'}
                </button>
              </>
            )}
          </div>
          {purchaseMut.isError && (
            <p className="mt-3 text-sm text-red-600">
              Unable to purchase. Please try again in a moment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </span>
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wide">{title}</div>
        <div className="text-slate-900 font-medium">{children}</div>
      </div>
    </div>
  );
}
