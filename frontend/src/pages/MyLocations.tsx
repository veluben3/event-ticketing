import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { authApi } from '../api/endpoints';
import LocationPickerMap from '../components/LocationPickerMap';
import type { UserLocation } from '../types';

type FormState = {
  label: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
};

const defaultForm: FormState = {
  label: '',
  addressLine: '',
  city: '',
  state: '',
  country: 'IN',
  latitude: 13.0827,
  longitude: 80.2707,
};

function toForm(location?: UserLocation | null): FormState {
  if (!location) return defaultForm;
  return {
    label: location.label,
    addressLine: location.addressLine ?? '',
    city: location.city ?? '',
    state: location.state ?? '',
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

export default function MyLocationsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<UserLocation | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const locationsQ = useQuery({
    queryKey: ['my-locations'],
    queryFn: () => authApi.locations(),
  });

  useEffect(() => {
    setForm(toForm(editing));
  }, [editing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) {
        return authApi.updateLocation(editing.id, form);
      }
      return authApi.createLocation(form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-locations'] });
      setEditing(null);
      setForm(defaultForm);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => authApi.deleteLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-locations'] }),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My locations</h1>
          <p className="text-sm text-slate-500">Save multiple map-based locations for future use and keep them up to date.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setForm(defaultForm);
          }}
        >
          <Plus size={16} />
          Add location
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="space-y-4">
          {locationsQ.isLoading ? (
            <div className="card p-6 text-slate-500">Loading locations…</div>
          ) : (locationsQ.data?.length ?? 0) === 0 ? (
            <div className="card p-8 text-center text-slate-500">No saved locations yet. Add one from the map to get started.</div>
          ) : (
            locationsQ.data!.map((location) => (
              <div key={location.id} className="card p-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <MapPin size={16} />
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{location.label}</div>
                      <div className="text-sm text-slate-500">
                        {[location.addressLine, location.city, location.state].filter(Boolean).join(', ') || 'Custom pinned point'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · {location.country}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={() => setEditing(location)}>
                    <Pencil size={16} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => deleteMut.mutate(location.id)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="card p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit location' : 'Add location'}</h2>
            <p className="text-sm text-slate-500">Click anywhere on the map to place the marker, then save the location details.</p>
          </div>

          <LocationPickerMap
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(latitude, longitude) => setForm((current) => ({ ...current, latitude, longitude }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Label">
              <input className="input" value={form.label} onChange={(e) => setForm((current) => ({ ...current, label: e.target.value }))} placeholder="Home, Office, Pickup point" />
            </Field>
            <Field label="Country">
              <input className="input" value={form.country} maxLength={2} onChange={(e) => setForm((current) => ({ ...current, country: e.target.value.toUpperCase() }))} />
            </Field>
          </div>

          <Field label="Address line">
            <input className="input" value={form.addressLine} onChange={(e) => setForm((current) => ({ ...current, addressLine: e.target.value }))} placeholder="Street, landmark, apartment" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="City">
              <input className="input" value={form.city} onChange={(e) => setForm((current) => ({ ...current, city: e.target.value }))} />
            </Field>
            <Field label="State">
              <input className="input" value={form.state} onChange={(e) => setForm((current) => ({ ...current, state: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Latitude">
              <input
                type="number"
                step="0.000001"
                className="input"
                value={form.latitude}
                onChange={(e) => setForm((current) => ({ ...current, latitude: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="0.000001"
                className="input"
                value={form.longitude}
                onChange={(e) => setForm((current) => ({ ...current, longitude: Number(e.target.value) }))}
              />
            </Field>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !form.label.trim()}
            >
              {saveMut.isPending ? 'Saving…' : editing ? 'Update location' : 'Save location'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditing(null);
                setForm(defaultForm);
              }}
            >
              Clear
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
