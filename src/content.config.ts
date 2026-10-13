import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { isValidHours } from './lib/hours';
import { AREAS, BOUNDS, NOISE, OUTLETS, SOURCE_TYPES, WIFI_PASSWORD } from './lib/meta';

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
const triState = z.enum(['yes', 'no', 'unknown']);

const shops = defineCollection({
  // One YAML file per shop; the file name is the URL slug.
  loader: glob({ pattern: '*.yaml', base: './data/shops' }),
  schema: z
    .object({
      name: z.string().min(1),
      chain: z.boolean().default(false),
      status: z.enum(['open', 'closed']).default('open'),
      area: z.enum(keys(AREAS)),
      address: z.string().min(1),
      lat: z.number().min(BOUNDS.south).max(BOUNDS.north),
      lng: z.number().min(BOUNDS.west).max(BOUNDS.east),
      summary: z.string().max(200).optional(),
      wifi: z
        .object({
          available: triState.default('unknown'),
          password: z.enum(keys(WIFI_PASSWORD)).default('unknown'),
          // The actual password, when a local reported it. Shown with the date it was reported.
          password_value: z.string().max(64).optional(),
          password_reported: z.coerce.date().optional(),
          notes: z.string().max(200).optional(),
        })
        .refine((w) => !w.password_value || w.password_reported, {
          message: 'password_value needs password_reported (the date someone reported it)',
        })
        .default({ available: 'unknown', password: 'unknown' }),
      power: z
        .object({
          outlets: z.enum(keys(OUTLETS)).default('unknown'),
          notes: z.string().max(200).optional(),
        })
        .default({ outlets: 'unknown' }),
      laptop_friendly: triState.default('unknown'),
      laptop_policy: z.string().max(200).optional(),
      noise: z.enum(keys(NOISE)).default('unknown'),
      hours: z
        .string()
        .refine(isValidHours, { message: 'Unparseable hours; use OSM format like "Mo-Fr 07:00-17:00; Sa off"' })
        .optional(),
      links: z
        .object({
          website: z.url().optional(),
          instagram: z.url().optional(),
          facebook: z.url().optional(),
        })
        .default({}),
      // Date a human last confirmed the Wi-Fi/outlet details. Drives the freshness badge.
      last_verified: z.coerce.date().optional(),
      sources: z
        .array(
          z.object({
            type: z.enum(keys(SOURCE_TYPES)),
            date: z.coerce.date(),
            note: z.string().max(200).optional(),
            url: z.url().optional(),
          }),
        )
        .min(1),
    })
    .strict(),
});

// Temporary places with free Wi-Fi or charging, e.g. relief sites after a storm.
// Hidden automatically once `until` has passed (or 3 days after `posted` if no end date is known).
const spots = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './data/spots' }),
  schema: z
    .object({
      name: z.string().min(1),
      kind: z.array(z.enum(['wifi', 'charging', 'water', 'food', 'cooling'])).min(1),
      host: z.string().optional(),
      address: z.string().min(1),
      lat: z.number().min(BOUNDS.south).max(BOUNDS.north),
      lng: z.number().min(BOUNDS.west).max(BOUNDS.east),
      details: z.string().max(300).optional(),
      posted: z.coerce.date(),
      until: z.coerce.date().optional(),
      source: z.object({ name: z.string(), url: z.url().optional() }),
    })
    .strict(),
});

export const collections = { shops, spots };
