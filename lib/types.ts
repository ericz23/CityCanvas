// Import Prisma types
import type { Event, Source, EventStatus, SourceKind } from '@prisma/client'

// API-specific types for frontend consumption
export type Venue = {
  name?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
}

export type SourceMini = { label?: string | null; url?: string | null }

export type ApiEvent = {
  id: string
  title: string
  description?: string | null
  startsAt: string
  endsAt?: string | null
  venue?: Venue | null
  categories?: string[]
  tags?: string[]
  priceMin?: number | null
  priceMax?: number | null
  currency?: string | null
  isFree?: boolean
  ticketUrl?: string | null
  imageUrl?: string | null
  source?: SourceMini | null
  sourceConfidence?: number
}

// Database query helpers
export type EventWithSource = Event & {
  source: Source
}

// API response types
export type EventsApiResponse = {
  events: ApiEvent[]
  nextCursor: string | null
  lastUpdated: string
}

export type CategoriesApiResponse = {
  categories: Array<{ slug: string; name: string }>
  tags: Array<{ slug: string; name: string }>
}

// Bounding box type for geographic queries
export type BoundingBox = {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}
