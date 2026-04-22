import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { ticketsApi } from '../api/endpoints';

export default function CheckoutPage() {
  const { ticketId = '' } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketsApi.get(ticketId),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === 'PAID' || status === 'FAILED' ? false : 2000;
    },
    enabled: !!ticketId,
  });

  if (isLoading || !data) {
    return <div className="p-10 text-center text-slate-500">Loading payment status…</div>;
  }

  const statusMap = {
    PENDING: {
      icon: <Clock className="text-amber-500" size={28} />,
      title: 'Processing payment…',
      desc: 'Our payment processor is confirming your order. This usually takes a few seconds.',
      color: 'bg-amber-50 border-amber-200',
    },
    PAID: {
      icon: <CheckCircle2 className="text-emerald-600" size={28} />,
      title: 'Payment successful!',
      desc: 'Your ticket is confirmed. Check your email for the e-ticket.',
      color: 'bg-emerald-50 border-emerald-200',
    },
    FAILED: {
      icon: <XCircle className="text-red-600" size={28} />,
      title: 'Payment failed',
      desc: 'The gateway declined the transaction. Please try again.',
      color: 'bg-red-50 border-red-200',
    },
    CANCELLED: {
      icon: <XCircle className="text-slate-500" size={28} />,
      title: 'Cancelled',
      desc: 'This order was cancelled.',
      color: 'bg-slate-50 border-slate-200',
    },
    REFUNDED: {
      icon: <CheckCircle2 className="text-sky-600" size={28} />,
      title: 'Refunded',
      desc: 'This order has been refunded.',
      color: 'bg-sky-50 border-sky-200',
    },
  } as const;

  const view = statusMap[data.status];

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-10">
      <div className={`card p-8 border ${view.color}`}>
        <div className="flex items-center gap-4 mb-4">{view.icon}
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{view.title}</h1>
            <p className="text-sm text-slate-600">{view.desc}</p>
          </div>
        </div>

        <dl className="text-sm divide-y divide-slate-200">
          <Row label="Event" value={data.event?.title ?? '—'} />
          <Row label="Ticket type" value={data.ticketType?.name ?? 'General Admission'} />
          <Row label="Order reference" value={data.orderRef} />
          <Row label="Quantity" value={String(data.quantity)} />
          <Row
            label="Amount"
            value={(data.totalCents / 100).toLocaleString('en-IN', {
              style: 'currency',
              currency: data.currency,
            })}
          />
          <Row label="Payment provider" value={data.payment?.provider ?? 'mock'} />
          {data.payment?.providerRef && <Row label="Provider ref" value={data.payment.providerRef} />}
        </dl>

        <div className="flex gap-3 mt-6">
          <Link to="/my-tickets" className="btn-secondary">
            View all tickets
          </Link>
          <Link to="/" className="btn-primary">
            Keep browsing
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900 font-medium text-right break-all">{value}</dd>
    </div>
  );
}
