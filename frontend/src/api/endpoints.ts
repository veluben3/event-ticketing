import { api } from './client';
import type {
  EventDto,
  EventsListResponse,
  TicketDto,
  User,
  Role,
  EventCategory,
  UserLocation,
} from '../types';

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    name: string;
    role?: Role;
    companyName?: string;
  }) => api.post<{ user: User }>('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api
      .post<{ user: User; accessToken: string }>('/auth/login', data)
      .then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  refresh: () =>
    api.post<{ accessToken: string }>('/auth/refresh').then((r) => r.data.accessToken),
  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user),
  locations: () => api.get<{ items: UserLocation[] }>('/auth/locations').then((r) => r.data.items),
  createLocation: (data: Omit<UserLocation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    api.post<{ location: UserLocation }>('/auth/locations', data).then((r) => r.data.location),
  updateLocation: (
    id: string,
    data: Partial<Omit<UserLocation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  ) => api.patch<{ location: UserLocation }>(`/auth/locations/${id}`, data).then((r) => r.data.location),
  deleteLocation: (id: string) => api.delete(`/auth/locations/${id}`).then((r) => r.data),
};

export const eventsApi = {
  list: (params: {
    city?: string;
    category?: EventCategory;
    q?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api.get<EventsListResponse>('/events', { params }).then((r) => r.data),
  cities: () => api.get<{ cities: string[] }>('/events/cities').then((r) => r.data.cities),
  get: (id: string) => api.get<{ event: EventDto }>(`/events/${id}`).then((r) => r.data.event),
  create: (data: {
    title: string;
    description: string;
    category: EventCategory;
    venue: string;
    addressLine?: string;
    city: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    startAt: string;
    endAt: string;
    capacity: number;
    bannerUrl?: string;
    status?: EventDto['status'];
    ticketTypes: Array<{ name: string; description?: string; priceCents: number }>;
  }) =>
    api.post<{ event: EventDto }>('/events', data).then((r) => r.data.event),
  update: (id: string, data: Partial<EventDto>) =>
    api.patch<{ event: EventDto }>(`/events/${id}`, data).then((r) => r.data.event),
  mine: (params?: { page?: number; pageSize?: number }) =>
    api.get<EventsListResponse>('/events/mine', { params }).then((r) => r.data),
};

export const ticketsApi = {
  purchase: (data: { eventId: string; ticketTypeId: string; quantity: number }, idempotencyKey?: string) =>
    api
      .post<{ ticket: TicketDto }>('/tickets/purchase', data, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      })
      .then((r) => r.data.ticket),
  list: () =>
    api
      .get<{ items: TicketDto[]; total: number }>('/tickets')
      .then((r) => r.data),
  get: (id: string) => api.get<{ ticket: TicketDto }>(`/tickets/${id}`).then((r) => r.data.ticket),
  organizerSales: () =>
    api.get<{ items: TicketDto[] }>('/tickets/organizer/sales').then((r) => r.data.items),
};

export const uploadApi = {
  eventImage: (eventId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api
      .post<{ url: string }>(`/upload/events/${eventId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.url);
  },
};
