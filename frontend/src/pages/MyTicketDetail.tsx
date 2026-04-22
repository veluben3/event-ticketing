import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, MapPin, ReceiptText, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { ticketsApi } from '../api/endpoints';

function money(cents: number, currency: string) {
  return (cents / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency,
  });
}

export default function MyTicketDetailPage() {
  const { ticketId = '' } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketsApi.get(ticketId),
    enabled: !!ticketId,
  });

  if (isLoading) {
    return <div className="p-10 text-center text-slate-500">Loading ticket details…</div>;
  }

  if (!data) {
    return <div className="p-10 text-center text-slate-500">Ticket not found</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ticket details</h1>
          <p className="text-sm text-slate-500">Everything about this booking in one place.</p>
        </div>
        <Link to="/my-tickets" className="btn-secondary">
          Back to my tickets
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.9fr]">
        <section className="card p-6 space-y-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Ticket size={20} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{data.event?.title ?? 'Event'}</h2>
              <p className="text-sm text-slate-500">{data.ticketType?.name ?? 'General Admission'}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard icon={<CalendarDays size={16} />} label="Event date" value={data.event?.startAt ? format(new Date(data.event.startAt), 'PPP p') : '—'} />
            <InfoCard icon={<MapPin size={16} />} label="Venue" value={data.event ? `${data.event.venue}, ${data.event.city}` : '—'} />
            <InfoCard icon={<ReceiptText size={16} />} label="Order reference" value={data.orderRef} mono />
            <InfoCard icon={<Ticket size={16} />} label="Ticket quantity" value={String(data.quantity)} />
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">Ticket conditions</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {data.ticketType?.description || 'No extra conditions were added for this ticket type.'}
            </div>
          </div>
        </section>

        <aside className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Payment summary</h2>
          <DetailRow label="Status" value={data.status} />
          <DetailRow label="Ticket type" value={data.ticketType?.name ?? 'General Admission'} />
          <DetailRow label="Amount" value={money(data.totalCents, data.currency)} />
          <DetailRow label="Payment provider" value={data.payment?.provider ?? 'mock'} />
          {data.payment?.providerRef && <DetailRow label="Provider ref" value={data.payment.providerRef} />}

          <div className="flex flex-col gap-2 pt-2">
            {data.status === 'PENDING' && (
              <Link to={`/checkout/${data.id}`} className="btn-primary">
                Track payment
              </Link>
            )}
            <Link to={`/events/${data.eventId}`} className="btn-secondary">
              Open event page
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-2 text-slate-900 ${mono ? 'font-mono text-sm' : 'font-medium'}`}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900 break-all">{value}</span>
    </div>
  );
}
