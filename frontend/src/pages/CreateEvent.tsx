import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { eventsApi, uploadApi } from '../api/endpoints';
import type { EventCategory } from '../types';

const CATEGORIES = [
  'MUSIC',
  'SPORTS',
  'CONFERENCE',
  'THEATRE',
  'FESTIVAL',
  'COMEDY',
  'WORKSHOP',
  'OTHER',
] as const satisfies readonly EventCategory[];

const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Ticket type name is required'),
  description: z.string().optional(),
  priceRupees: z.coerce.number().int().min(0),
});

const schema = z
  .object({
    title: z.string().min(3),
    description: z.string().min(10),
    category: z.enum(CATEGORIES),
    venue: z.string().min(2),
    addressLine: z.string().optional(),
    city: z.string().min(2),
    state: z.string().optional(),
    country: z.string().length(2).default('IN'),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    capacity: z.coerce.number().int().positive(),
    publish: z.boolean().default(true),
    ticketTypes: z.array(ticketTypeSchema).min(1).max(10),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    path: ['endAt'],
    message: 'End must be after start',
  });

type FormValues = z.infer<typeof schema>;

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: 'IN',
      publish: true,
      ticketTypes: [{ name: 'General Admission', description: '', priceRupees: 999 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ticketTypes',
  });

  const ticketTypes = watch('ticketTypes');

  const createMut = useMutation({
    mutationFn: async (values: FormValues) => {
      const created = await eventsApi.create({
        title: values.title,
        description: values.description,
        category: values.category,
        venue: values.venue,
        addressLine: values.addressLine,
        city: values.city,
        state: values.state,
        country: values.country,
        latitude: values.latitude,
        longitude: values.longitude,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        capacity: values.capacity,
        ticketTypes: values.ticketTypes.map((ticketType) => ({
          name: ticketType.name,
          description: ticketType.description,
          priceCents: Math.round(ticketType.priceRupees * 100),
        })),
        status: values.publish ? 'PUBLISHED' : 'DRAFT',
      });

      if (bannerFile) {
        await uploadApi.eventImage(created.id, bannerFile);
      }
      return created;
    },
    onSuccess: () => navigate('/organizer'),
    onError: (err: unknown) => {
      const anyErr = err as { response?: { data?: { error?: { message?: string } } } };
      setServerError(anyErr.response?.data?.error?.message ?? 'Failed to create event');
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Create a new event</h1>
      <form onSubmit={handleSubmit((v) => createMut.mutate(v))} className="card p-6 space-y-6" noValidate>
        <div>
          <label className="label">Title</label>
          <input className="input" placeholder="Summer Music Fest 2026" {...register('title')} />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[120px]" placeholder="What's this event about?" {...register('description')} />
          {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select className="input" {...register('category')}>
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>}
          </div>
          <div>
            <label className="label">Capacity</label>
            <input type="number" className="input" placeholder="e.g. 500" {...register('capacity')} />
            {errors.capacity && <p className="text-xs text-red-600 mt-1">{errors.capacity.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Starts at</label>
            <input type="datetime-local" className="input" {...register('startAt')} />
            {errors.startAt && <p className="text-xs text-red-600 mt-1">{errors.startAt.message}</p>}
          </div>
          <div>
            <label className="label">Ends at</label>
            <input type="datetime-local" className="input" {...register('endAt')} />
            {errors.endAt && <p className="text-xs text-red-600 mt-1">{errors.endAt.message}</p>}
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Ticket types</h2>
              <p className="text-sm text-slate-500">Add multiple ticket prices and explain who each ticket is for.</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => append({ name: '', description: '', priceRupees: 0 })}
              disabled={fields.length >= 10}
            >
              Add ticket type
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-medium text-slate-900">Ticket type {index + 1}</div>
                  {fields.length > 1 && (
                    <button type="button" className="text-sm text-red-600 hover:text-red-700" onClick={() => remove(index)}>
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Name</label>
                    <input className="input" placeholder="VIP" {...register(`ticketTypes.${index}.name`)} />
                    {errors.ticketTypes?.[index]?.name && (
                      <p className="text-xs text-red-600 mt-1">{errors.ticketTypes[index]?.name?.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Price (₹)</label>
                    <input type="number" min={0} className="input" placeholder="1499" {...register(`ticketTypes.${index}.priceRupees`)} />
                    {errors.ticketTypes?.[index]?.priceRupees && (
                      <p className="text-xs text-red-600 mt-1">{errors.ticketTypes[index]?.priceRupees?.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">Conditions / details</label>
                  <textarea
                    className="input min-h-[88px]"
                    placeholder="Example: Front-row access, complimentary drink, early entry"
                    {...register(`ticketTypes.${index}.description`)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm text-slate-600">
            Starting from{' '}
            <span className="font-semibold text-slate-900">
              {Math.min(...ticketTypes.map((ticketType) => ticketType.priceRupees || 0)).toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
              })}
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Venue</label>
            <input className="input" placeholder="Marina Grounds" {...register('venue')} />
            {errors.venue && <p className="text-xs text-red-600 mt-1">{errors.venue.message}</p>}
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" placeholder="Chennai" {...register('city')} />
            {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Address line</label>
          <input className="input" placeholder="Street, landmark, block number" {...register('addressLine')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">State</label>
            <input className="input" {...register('state')} />
          </div>
          <div>
            <label className="label">Latitude</label>
            <input className="input" placeholder="13.0827" {...register('latitude')} />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input className="input" placeholder="80.2707" {...register('longitude')} />
          </div>
        </div>

        <div>
          <label className="label">Banner image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          />
          <p className="text-xs text-slate-500 mt-1">JPG/PNG/WEBP up to 5MB. Uploaded after the event is created.</p>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="publish" className="rounded" {...register('publish')} />
          <label htmlFor="publish" className="text-sm text-slate-700">
            Publish immediately (visible to users)
          </label>
        </div>

        {serverError && (
          <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-md px-3 py-2">
            {serverError}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate('/organizer')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting || createMut.isPending}>
            {isSubmitting || createMut.isPending ? 'Creating…' : 'Create event'}
          </button>
        </div>
      </form>
    </div>
  );
}
