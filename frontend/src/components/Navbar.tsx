import { Link, NavLink } from 'react-router-dom';
import { Ticket, Calendar, LayoutDashboard, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition ${
      isActive ? 'text-brand-700 bg-brand-50' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/80 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-slate-900">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand-600 text-white">
            <Calendar size={18} />
          </span>
          EventHub
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={navClass}>
            Discover
          </NavLink>
          {user && (
            <NavLink to="/my-tickets" className={navClass}>
              My tickets
            </NavLink>
          )}
          {user && (user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
            <NavLink to="/organizer" className={navClass}>
              Organizer
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
                <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="font-medium text-slate-900">{user.name}</span>
                <span className="hidden lg:inline text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {user.role}
                </span>
              </div>
              {user.role === 'ORGANIZER' || user.role === 'ADMIN' ? (
                <Link to="/organizer" className="btn-secondary hidden sm:inline-flex">
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
              ) : (
                <Link to="/my-tickets" className="btn-secondary hidden sm:inline-flex">
                  <Ticket size={16} /> My tickets
                </Link>
              )}
              <button onClick={logout} className="btn-secondary" aria-label="Logout">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">
                <LogIn size={16} /> Sign in
              </Link>
              <Link to="/register" className="btn-primary">
                <UserPlus size={16} /> Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
