import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import type { ApiEvent, EventWithSource } from "@/lib/types"

function parseBBox(str?: string | null) {
  if (!str) return null
  const nums = str.split(",").map((s) => Number(s))
  if (nums.length !== 4 || nums.some((n) => Number.isNaN(n))) return null
  return { minLng: nums[0], minLat: nums[1], maxLng: nums[2], maxLat: nums[3] }
}

function applyCategories(ev: ApiEvent, cats: string[]) {
  return cats.some((cat) => ev.categories?.includes(cat))
}

function applyPriceFilter(ev: ApiEvent, price: string) {
  if (price === "any") return true
  if (price === "free") return ev.isFree
  if (price === "paid") return !ev.isFree
  return true
}

function applyTimeOfDay(ev: ApiEvent, tod: string) {
  if (tod === "any") return true
  const hour = new Date(ev.startsAt).getHours()
  if (tod === "morning") return hour >= 6 && hour < 12
  if (tod === "afternoon") return hour >= 12 && hour < 17
  if (tod === "evening") return hour >= 17 && hour < 22
  if (tod === "night") return hour >= 22 || hour < 6
  return true
}

function applyQuery(ev: ApiEvent, q: string) {
  const query = q.toLowerCase()
  const title = ev.title?.toLowerCase() ?? ""
  const desc = ev.description?.toLowerCase() ?? ""
  const venue = ev.venue?.name?.toLowerCase() ?? ""
  const addr = ev.venue?.address?.toLowerCase() ?? ""
  return title.includes(query) || desc.includes(query) || venue.includes(query) || addr.includes(query)
}

function dateRangeFromPreset(preset?: string | null): { start: Date; end: Date } {
  const now = new Date()
  let start: Date, end: Date

  switch (preset) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
      break
    case "tomorrow":
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      start = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
      break
    case "3d":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000)
      break
    case "7d":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
      break
    case "week":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
      break
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
      break
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  }
  
  return { start, end }
}

// Convert database event to API format
function eventToApiEvent(event: EventWithSource): ApiEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() || null,
    venue: {
      name: event.venueName,
      address: event.address,
      lat: event.lat,
      lng: event.lng,
    },
    categories: event.categories,
    tags: event.tags,
    priceMin: event.priceMin,
    priceMax: event.priceMax,
    currency: event.currency,
    isFree: event.isFree,
    ticketUrl: event.ticketUrl,
    imageUrl: event.imageUrl,
    source: {
      label: event.source.label,
      url: event.source.url,
    },
    sourceConfidence: event.sourceConfidence,
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const bbox = parseBBox(url.searchParams.get("bbox"))
    const startStr = url.searchParams.get("start")
    const endStr = url.searchParams.get("end")
    const preset = url.searchParams.get("preset")
    const catsStr = url.searchParams.get("categories") ?? ""
    const price = url.searchParams.get("price") ?? "any"
    const tod = url.searchParams.get("tod") ?? "any"
    const q = url.searchParams.get("q") ?? ""
    const limit = Number(url.searchParams.get("limit") ?? 200)

    const { start, end } =
      startStr && endStr ? { start: new Date(startStr), end: new Date(endStr) } : dateRangeFromPreset(preset)

    // Build database query filters
    const whereClause: any = {
      status: "ACTIVE", // Only show active events
      startsAt: {
        gte: start,
        lte: end,
      },
      sourceConfidence: {
        gte: 0.4, // Confidence threshold
      },
    }

    // Add category filter if provided
    const cats = catsStr.split(",").filter(Boolean)
    if (cats.length > 0) {
      whereClause.categories = {
        hasSome: cats,
      }
    }

    // Query database (without bounding box filter)
    const dbEvents = await prisma.event.findMany({
      where: whereClause,
      include: {
        source: true,
      },
      orderBy: {
        startsAt: 'asc',
      },
      take: limit * 2, // Take more to allow for post-processing filters
    })

    // Convert to API format
    let events: ApiEvent[] = dbEvents.map(eventToApiEvent)

    // Apply bounding box filter in memory (only for events with coordinates)
    if (bbox) {
      events = events.filter((event) => {
        // If event has coordinates, check if they're within the bounding box
        if (event.venue?.lat && event.venue?.lng) {
          return (
            event.venue.lat >= bbox.minLat &&
            event.venue.lat <= bbox.maxLat &&
            event.venue.lng >= bbox.minLng &&
            event.venue.lng <= bbox.maxLng
          )
        }
        // If event doesn't have coordinates, include it anyway
        return true
      })
    }

    // Apply filters that are easier to do in memory
    if (price !== "any") {
      events = events.filter((e) => applyPriceFilter(e, price))
    }

    if (tod !== "any") {
      events = events.filter((e) => applyTimeOfDay(e, tod))
    }

    if (q) {
      events = events.filter((e) => applyQuery(e, q))
    }

    // Apply final limit
    if (events.length > limit) {
      events = events.slice(0, limit)
    }

    // Get last updated timestamp from the most recently updated event
    const lastUpdated = dbEvents.length > 0 
      ? Math.max(...dbEvents.map(e => e.updatedAt.getTime()))
      : Date.now()

    return NextResponse.json({
      events,
      nextCursor: null,
      lastUpdated: new Date(lastUpdated).toISOString(),
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
