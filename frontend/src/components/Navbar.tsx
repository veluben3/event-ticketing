import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  LayoutDashboard,
  LogOut,
  LogIn,
  UserPlus,
  MapPin,
  ChevronDown,
  Check,
  Ticket,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/endpoints';
import type { UserLocation } from '../types';

const selectedLocationStorageKey = 'eventhub.selectedLocationId';

function formatLocation(location: UserLocation | null | undefined) {
  if (!location) return 'Choose your location';
  const detail = [location.addressLine, location.city, location.state].filter(Boolean).join(', ');
  return detail || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

function useOutsideClose<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  return ref;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(selectedLocationStorageKey),
  );
  const [locationOpen, setLocationOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const locationsQ = useQuery({
    queryKey: ['my-locations'],
    queryFn: () => authApi.locations(),
    enabled: !!user,
  });

  const selectedLocation = useMemo(() => {
    const items = locationsQ.data ?? [];
    return items.find((location) => location.id === selectedLocationId) ?? items[0] ?? null;
  }, [locationsQ.data, selectedLocationId]);

  useEffect(() => {
    if (!user) {
      setSelectedLocationId(null);
      setLocationOpen(false);
      setMenuOpen(false);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(selectedLocationStorageKey);
      }
      return;
    }

    if (selectedLocation?.id && selectedLocation.id !== selectedLocationId) {
      setSelectedLocationId(selectedLocation.id);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(selectedLocationStorageKey, selectedLocation.id);
      }
    }
  }, [selectedLocation, selectedLocationId, user]);

  const locationRef = useOutsideClose<HTMLDivElement>(locationOpen, () => setLocationOpen(false));
  const menuRef = useOutsideClose<HTMLDivElement>(menuOpen, () => setMenuOpen(false));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Calendar size={18} />
            </span>
            <div className="leading-tight">
              <div className="text-xl font-bold tracking-tight text-slate-900">EventHub</div>
            </div>
          </Link>

          {user && (
            <div ref={locationRef} className="relative min-w-0">
              <button
                type="button"
                onClick={() => {
                  setLocationOpen((current) => !current);
                  setMenuOpen(false);
                }}
                className={`flex h-11 min-w-[240px] max-w-[380px] items-center gap-3 rounded-xl border px-3 text-left shadow-sm transition ${
                  locationOpen
                    ? 'border-brand-300 bg-white ring-2 ring-brand-200/70'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <MapPin size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">
                    {selectedLocation?.label ?? 'Select location'}
                  </div>
                  <div className="truncate text-xs text-slate-500">{formatLocation(selectedLocation)}</div>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-slate-500 transition ${locationOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {locationOpen && (
                <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
                  <div className="px-3 py-2">
                    <div className="text-sm font-semibold text-slate-900">Choose location</div>
                    <div className="text-xs text-slate-500">
                      Pick the address you want to use across the app.
                    </div>
                  </div>

                  <div className="max-h-60 overflow-auto px-1 pb-1">
                    {(locationsQ.data?.length ?? 0) === 0 ? (
                      <div className="px-3 py-5 text-sm text-slate-500">No saved locations yet.</div>
                    ) : (
                      locationsQ.data!.map((location) => {
                        const active = location.id === selectedLocation?.id;
                        return (
                          <button
                            key={location.id}
                            type="button"
                            className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition ${
                              active
                                ? 'bg-slate-400 text-slate-800'
                                : ' text-slate-800 hover:bg-slate-200 bg-slate-200'
                            }`}
                            onClick={() => {
                              setSelectedLocationId(location.id);
                              setLocationOpen(false);
                              if (typeof window !== 'undefined') {
                                window.localStorage.setItem(selectedLocationStorageKey, location.id);
                              }
                            }}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{location.label}</div>
                              <div
                                className={`truncate text-xs ${
                                  active ? 'text-slate-700' : 'text-slate-500'
                                }`}
                              >
                                {formatLocation(location)}
                              </div>
                            </div>
                            {active && <Check size={16} className="mt-0.5 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <Link
                      to="/my-locations"
                      onClick={() => setLocationOpen(false)}
                      className="btn-secondary h-10 w-full justify-center text-sm"
                    >
                      Manage saved locations
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <div className="hidden h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 shadow-sm sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.role}</div>
                </div>
              </div>

              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen((current) => !current);
                    setLocationOpen(false);
                  }}
                  className={`btn-secondary h-11 min-w-[132px] bg-white text-slate-900 shadow-sm ${
                    menuOpen ? 'border-brand-300 ring-2 ring-brand-200/70' : ''
                  }`}
                >
                  Menu
                  <ChevronDown
                    size={14}
                    className={`transition ${menuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {menuOpen && (
                  <div
                    className="absolute lefr-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.18)]"
                    style={{ width: '11rem', minWidth: '11rem' }}
                  >
                    <Link
                      to="/"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                    >
                      <Compass size={16} />
                      Browse events
                    </Link>
                    <Link
                      to="/my-tickets"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                    >
                      <Ticket size={16} />
                      My tickets
                    </Link>
                    <Link
                      to="/my-locations"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                    >
                      <MapPin size={16} />
                      My locations
                    </Link>
                    {(user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
                      <Link
                        to="/organizer"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                      >
                        <LayoutDashboard size={16} />
                        Organizer dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
