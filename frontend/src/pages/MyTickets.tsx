import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Ticket as TicketIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ticketsApi } from '../api/endpoints';
import type { TicketStatus } from '../types';

const statusStyle: Record<TicketStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  REFUNDED: 'bg-sky-50 text-sky-700 border-sky-200',
};

export default function MyTicketsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => ticketsApi.list(),
    refetchInterval: 5000,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center">
          <TicketIcon size={18} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My tickets</h1>
          <p className="text-sm text-slate-500">Tracks every purchase, its ticket type, and current payment status.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-6 text-slate-500">Loading…</div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          You haven't booked any tickets yet. <Link to="/" className="text-brand-700 font-medium">Browse events</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {data!.items.map((t) => (
            <div key={t.id} className="card p-5 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[240px]">
                <div className="font-semibold text-slate-900">{t.event?.title ?? 'Event'}</div>
                <div className="text-sm text-slate-500">
                  {t.event?.venue}, {t.event?.city} · {t.event?.startAt && format(new Date(t.event.startAt), 'PPP p')}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
                    {t.ticketType?.name ?? 'General Admission'}
                  </span>
                  {t.ticketType?.description && (
                    <span className="text-slate-500">{t.ticketType.description}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-2">Order {t.orderRef}</div>
              </div>
              <div className="text-sm text-slate-600">× {t.quantity}</div>
              <div className="font-semibold text-slate-900">
                {(t.totalCents / 100).toLocaleString('en-IN', {
                  style: 'currency',
                  currency: t.currency,
                })}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusStyle[t.status]}`}>{t.status}</span>
              <div className="flex gap-2 ml-auto">
                <Link className="btn-secondary text-xs" to={`/my-tickets/${t.id}`}>
                  View details
                </Link>
                {t.status === 'PENDING' && (
                  <Link className="btn-secondary text-xs" to={`/checkout/${t.id}`}>
                    Track payment
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
