import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import EventsListPage from './pages/EventsList';
import EventDetailPage from './pages/EventDetail';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import MyTicketsPage from './pages/MyTickets';
import MyTicketDetailPage from './pages/MyTicketDetail';
import CheckoutPage from './pages/Checkout';
import CreateEventPage from './pages/CreateEvent';
import OrganizerDashboardPage from './pages/OrganizerDashboard';
import MyLocationsPage from './pages/MyLocations';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<EventsListPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/my-tickets"
            element={
              <ProtectedRoute>
                <MyTicketsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tickets/:ticketId"
            element={
              <ProtectedRoute>
                <MyTicketDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-locations"
            element={
              <ProtectedRoute>
                <MyLocationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout/:ticketId"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer"
            element={
              <ProtectedRoute roles={['ORGANIZER', 'ADMIN']}>
                <OrganizerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/new"
            element={
              <ProtectedRoute roles={['ORGANIZER', 'ADMIN']}>
                <CreateEventPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        EventHub &copy; {new Date().getFullYear()} · B2B listings + B2C ticketing
      </footer>
    </div>
  );
}
