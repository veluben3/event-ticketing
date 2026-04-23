export type Role = 'USER' | 'ORGANIZER' | 'ADMIN';

export type EventCategory =
  | 'MUSIC'
  | 'SPORTS'
  | 'CONFERENCE'
  | 'THEATRE'
  | 'FESTIVAL'
  | 'COMEDY'
  | 'WORKSHOP'
  | 'OTHER';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'SOLD_OUT';

export type TicketStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'FAILED' | 'REFUNDED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyName?: string | null;
}

export interface EventImage {
  id: string;
  url: string;
  position: number;
}

export interface EventTicketType {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  position: number;
}

export interface EventDto {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  category: EventCategory;
  venue: string;
  addressLine?: string | null;
  city: string;
  state?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  startAt: string;
  endAt: string;
  priceCents: number;
  currency: string;
  capacity: number;
  ticketsSold: number;
  bannerUrl?: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  images?: EventImage[];
  ticketTypes?: EventTicketType[];
  organizer?: { id: string; name: string; companyName?: string | null };
}

export interface AiSearchEventDto extends EventDto {
  score: number;
  sentiment: string;
  categorySummary: string;
  semanticTags: string[];
  aiExplanation?: string;
  locationContext?: string;
}

export interface EventsListResponse {
  total: number;
  answer?: string;
  page: number;
  pageSize: number;
  items: EventDto[];
}

export interface TicketDto {
  id: string;
  orderRef: string;
  eventId: string;
  userId: string;
  quantity: number;
  totalCents: number;
  currency: string;
  status: TicketStatus;
  createdAt: string;
  event?: EventDto;
  ticketType?: EventTicketType | null;
  payment?: {
    status: 'INITIATED' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
    provider: string;
    providerRef?: string | null;
  };
}

export interface UserLocation {
  id: string;
  userId: string;
  label: string;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}
