import { NextResponse } from "next/server"
import seed from "@/data/seed-events.json"
import type { ApiEvent } from "@/lib/types"

function parseBBox(str?: string | null) {
  if (!str) return null
  const nums = str.split(",").map((s) => Number(s))
  if (nums.length !== 4 || nums.some((n) => Number.isNaN(n))) return null
  return { minLng: nums[0], minLat: nums[1], maxLng: nums[2], maxLat: nums[3] }
}

function inBBox(ev: ApiEvent, bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number }) {
  const lat = ev.venue?.lat
  const lng = ev.venue?.lng
  if (lat == null || lng == null) return false
  return lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat
}

function applyPriceFilter(ev: ApiEvent, price: string) {
  if (!price || price === "any") return true
  const min = ev.priceMin ?? null
  const max = ev.priceMax ?? null
  const isFree = ev.isFree ?? false
  switch (price) {
    case "free":
      return isFree || ((min ?? 0) === 0 && (max ?? 0) === 0)
    case "lt20":
      return (min != null && min < 20) || (max != null && max < 20)
    case "20to50":
      const low = min ?? 0
      const high = max ?? min ?? 0
      return high >= 20 && low <= 50
    case "gt50":
      return (min != null && min > 50) || (max != null && max > 50)
    default:
      return true
  }
}

function applyTimeOfDay(ev: ApiEvent, tod: string) {
  if (!tod || tod === "any") return true
  const start = new Date(ev.startsAt)
  const hour = start.getHours()
  switch (tod) {
    case "morning": // 5-12
      return hour >= 5 && hour < 12
    case "afternoon": // 12-17
      return hour >= 12 && hour < 17
    case "evening": // 17-21
      return hour >= 17 && hour < 21
    case "late": // 21-4
      return hour >= 21 || hour < 5
    default:
      return true
  }
}

function applyCategories(ev: ApiEvent, cats: string[]) {
  if (!cats.length) return true
  const c = ev.categories ?? []
  return cats.every((slug) => c.includes(slug))
}

function applyQuery(ev: ApiEvent, q: string) {
  if (!q) return true
  const s = q.toLowerCase()
  const hay = [
    ev.title,
    ev.description ?? "",
    ev.venue?.name ?? "",
    ev.venue?.address ?? "",
    (ev.categories ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase()
  return hay.includes(s)
}

function dateRangeFromPreset(preset?: string | null): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)
  switch (preset) {
    case "today":
      end.setHours(23, 59, 59, 999)
      break
    case "7d":
      end.setDate(end.getDate() + 7)
      break
    case "3d":
    default:
      end.setDate(end.getDate() + 3)
      break
  }
  return { start, end }
}

export async function GET(req: Request) {
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

  let events: ApiEvent[] = seed.events as any[]

  // Filter by date
  events = events.filter((e) => {
    const s = new Date(e.startsAt)
    return s >= start && s <= end
  })

  // BBox
  if (bbox) {
    events = events.filter((e) => inBBox(e, bbox))
  }

  // Categories
  const cats = catsStr.split(",").filter(Boolean)
  if (cats.length) {
    events = events.filter((e) => applyCategories(e, cats))
  }

  // Price
  events = events.filter((e) => applyPriceFilter(e, price))

  // Time of day
  events = events.filter((e) => applyTimeOfDay(e, tod))

  // Text search
  if (q) {
    events = events.filter((e) => applyQuery(e, q))
  }

  // Confidence threshold demo (hide < 0.4)
  events = events.filter((e) => (e.sourceConfidence ?? 0.6) >= 0.4)

  // Limit
  if (events.length > limit) events = events.slice(0, limit)

  return NextResponse.json({
    events,
    nextCursor: null,
    lastUpdated: (seed as any).lastUpdated ?? new Date().toISOString(),
  })
}
