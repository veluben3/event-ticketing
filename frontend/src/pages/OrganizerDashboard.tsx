import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, BarChart3, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { eventsApi, ticketsApi } from '../api/endpoints';

export default function OrganizerDashboardPage() {
  const eventsQ = useQuery({ queryKey: ['org-events'], queryFn: () => eventsApi.mine() });
  const salesQ = useQuery({ queryKey: ['org-sales'], queryFn: () => ticketsApi.organizerSales() });

  const totalRevenue =
    salesQ.data?.filter((t) => t.status === 'PAID').reduce((s, t) => s + t.totalCents, 0) ?? 0;
  const totalTickets =
    salesQ.data?.filter((t) => t.status === 'PAID').reduce((s, t) => s + t.quantity, 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organizer dashboard</h1>
          <p className="text-sm text-slate-500">Manage your listings and track sales (B2B).</p>
        </div>
        <Link to="/organizer/new" className="btn-primary">
          <Plus size={16} /> New event
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat
          label="Live events"
          value={String(eventsQ.data?.items.filter((e) => e.status === 'PUBLISHED').length ?? 0)}
          icon={<CalendarDays size={18} />}
        />
        <Stat label="Tickets sold" value={String(totalTickets)} icon={<BarChart3 size={18} />} />
        <Stat
          label="Revenue"
          value={(totalRevenue / 100).toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
          })}
          icon={<BarChart3 size={18} />}
        />
      </div>

      <section className="card overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Your events</h2>
          <span className="text-xs text-slate-500">{eventsQ.data?.total ?? 0} total</span>
        </div>
        {eventsQ.isLoading ? (
          <div className="p-6 text-slate-500">Loading…</div>
        ) : (eventsQ.data?.items.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-slate-500">
            You haven't created any events yet.{' '}
            <Link to="/organizer/new" className="text-brand-700 font-medium">
              Create your first event
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50">
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Sold</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eventsQ.data!.items.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/events/${e.id}`} className="font-medium text-slate-900 hover:underline">
                      {e.title}
                    </Link>
                    <div className="text-xs text-slate-500">{e.category}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{e.city}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {format(new Date(e.startAt), 'PP')}
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {e.ticketsSold}/{e.capacity}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent ticket sales</h2>
        </div>
        {salesQ.isLoading ? (
          <div className="p-6 text-slate-500">Loading…</div>
        ) : (salesQ.data?.length ?? 0) === 0 ? (
          <div className="p-6 text-slate-500">No ticket sales yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50">
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Buyer</th>
                <th className="px-4 py-2">Qty</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesQ.data!.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{t.orderRef}</td>
                  <td className="px-4 py-3 text-slate-700">{t.event?.title}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {(t as unknown as { user?: { name: string } }).user?.name ?? t.userId}
                  </td>
                  <td className="px-4 py-3">{t.quantity}</td>
                  <td className="px-4 py-3 font-medium">
                    {(t.totalCents / 100).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: t.currency,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-700">
        {icon}
      </span>
      <div>
        <div className="text-xs uppercase text-slate-500">{label}</div>
        <div className="text-xl font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}
