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
          notes: z.string().max(200).optional(),
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

export const collections = { shops };
