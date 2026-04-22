---
name: reactjs-frontend
description: Conventions for the React + Vite + Tailwind SaaS frontend in events-manage. Use when editing anything under frontend/.
---

# React Frontend Skill – events-manage

Follow these rules when editing code inside `events-manage/frontend/`.

## Stack

- **Bundler:** Vite 5
- **Language:** TypeScript (strict)
- **UI:** React 18, Tailwind CSS, lucide-react icons
- **Routing:** react-router-dom v6
- **State:** React Context for auth; @tanstack/react-query for server state
- **Forms:** react-hook-form + zod
- **HTTP:** axios instance in `src/api/client.ts`

## Layout

```
frontend/src/
  api/           // axios client + endpoint helpers (one per resource)
  context/       // AuthContext, maybe CartContext
  hooks/         // reusable hooks (useAuth, useEvents)
  pages/         // route components (Home, Login, EventDetail, ...)
  components/    // shared UI (Navbar, EventCard, Button)
  types/         // shared TS types mirroring API
```

## Conventions

1. The app is **multi-tenant SaaS**: two personas on the same UI.
   - **B2C (USER):** browse + search events, buy tickets.
   - **B2B (ORGANIZER):** organizer dashboard to create/manage events and see ticket sales.
   - **ADMIN:** superset of both.
2. `ProtectedRoute` wraps private routes; `OrganizerRoute` additionally checks `role === 'ORGANIZER' || 'ADMIN'`.
3. Axios client reads the access token from React state and refreshes on 401 via `/auth/refresh` with HttpOnly cookie.
4. Tailwind utility-first; shared components live in `components/`. Do not write ad-hoc CSS files.
5. **Design language:** clean SaaS aesthetic—white cards with subtle shadow, `indigo-600` primary, rounded-xl corners, generous spacing. Mobile-first.
6. Forms use `react-hook-form` with `zodResolver`; surface validation errors inline.
7. Server-state always fetched via react-query (`useQuery`/`useMutation`) — never put fetch calls directly in components.
8. Image uploads go to `POST /upload` and receive a URL; store that URL on the event record.
9. Never store JWTs in `localStorage` for long-lived data — keep access tokens in memory, use refresh via cookie.
10. Toast notifications via a central `useToast()` hook.

## UX patterns

- **Home / EventsList:** hero search bar with city + category + date range; responsive grid of EventCards; infinite scroll or paginated.
- **EventDetail:** banner image, organizer info, venue map (lat/lng), CTA "Buy Ticket" (B2C) or "Edit / View Sales" (owner).
- **Checkout:** single page, quantity + total, mock payment, polls /tickets/:id until status=PAID (driven by backend Kafka flow).
- **Organizer Dashboard:** table of own events + quick stats.
