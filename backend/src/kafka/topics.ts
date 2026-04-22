export const TOPICS = {
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_RESULT: 'payment.result',
  TICKET_CONFIRMED: 'ticket.confirmed',
  TICKET_CANCELLED: 'ticket.cancelled',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

export interface PaymentInitiatedEvent {
  ticketId: string;
  orderRef: string;
  userId: string;
  eventId: string;
  amountCents: number;
  currency: string;
  issuedAt: number;
}

export interface PaymentResultEvent {
  ticketId: string;
  orderRef: string;
  status: 'SUCCEEDED' | 'FAILED';
  providerRef?: string;
  reason?: string;
  processedAt: number;
}

export interface TicketConfirmedEvent {
  ticketId: string;
  orderRef: string;
  userId: string;
  eventId: string;
  confirmedAt: number;
}
