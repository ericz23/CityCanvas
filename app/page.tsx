"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { FiltersPanel, type FiltersState } from "@/components/filters-panel"
import { Header } from "@/components/header"
import { LastUpdatedBadge } from "@/components/last-updated-badge"
import { EventDetailDrawer } from "@/components/event-detail-drawer"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { ApiEvent } from "@/lib/types"

// Dynamically import MapView to prevent SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map-view").then(mod => ({ default: mod.MapView })), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
      <div className="text-muted-foreground">Loading map...</div>
    </div>
  )
})

type Bounds = {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

const SF_DEFAULT_BOUNDS: Bounds = {
  minLng: -122.55,
  minLat: 37.7,
  maxLng: -122.35,
  maxLat: 37.84,
}

export default function Page() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [bounds, setBounds] = useState<Bounds>(SF_DEFAULT_BOUNDS)
  const [events, setEvents] = useState<ApiEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [selected, setSelected] = useState<ApiEvent | null>(null)
  const [autoRefreshMs, setAutoRefreshMs] = useState<number>(0)
  const refreshTimerRef = useRef<number | null>(null)

  const initialFilters = useMemo<FiltersState>(() => {
    // Initialize filters from URL
    const f: FiltersState = {
      datePreset: (searchParams.get("date") as FiltersState["datePreset"]) ?? "3d",
      start: searchParams.get("start") ?? "",
      end: searchParams.get("end") ?? "",
      categories: (searchParams.get("categories") ?? "").split(",").filter(Boolean),
      price: (searchParams.get("price") as FiltersState["price"]) ?? "any",
      timeOfDay: (searchParams.get("tod") as FiltersState["timeOfDay"]) ?? "any",
      q: searchParams.get("q") ?? "",
    }
    return f
  }, [searchParams])

  const [filters, setFilters] = useState<FiltersState>(initialFilters)

  const updateUrl = useCallback(
    (next: Partial<FiltersState>, nextBounds?: Bounds) => {
      const params = new URLSearchParams(searchParams.toString())
      const f = { ...filters, ...next }

      if (f.datePreset) params.set("date", f.datePreset)
      if (f.start) params.set("start", f.start)
      else params.delete("start")
      if (f.end) params.set("end", f.end)
      else params.delete("end")
      params.set("categories", f.categories.join(","))
      params.set("price", f.price)
      params.set("tod", f.timeOfDay)
      if (f.q) params.set("q", f.q)
      else params.delete("q")

      const b = nextBounds ?? bounds
      if (b) {
        const bbox = [b.minLng, b.minLat, b.maxLng, b.maxLat].join(",")
        params.set("bbox", bbox)
      }

      router.replace(`${pathname}?${params.toString()}`)
    },
    [bounds, filters, pathname, router, searchParams],
  )

  const fetchEvents = useCallback(
    async (opts?: { showToast?: boolean }) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        const b = bounds
        params.set("bbox", [b.minLng, b.minLat, b.maxLng, b.maxLat].join(","))
        // Dates
        if (filters.datePreset === "custom" && filters.start && filters.end) {
          params.set("start", filters.start)
          params.set("end", filters.end)
        } else {
          // For presets, let API derive defaults based on preset
          params.set("preset", filters.datePreset)
        }
        if (filters.categories.length) params.set("categories", filters.categories.join(","))
        if (filters.price && filters.price !== "any") params.set("price", filters.price)
        if (filters.timeOfDay && filters.timeOfDay !== "any") params.set("tod", filters.timeOfDay)
        if (filters.q) params.set("q", filters.q)
        params.set("limit", "500")

        const res = await fetch(`/api/events?${params.toString()}`, { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to fetch events")
        const data = await res.json()
        console.log("Fetched events:", data.events?.length || 0, "events")
        setEvents(data.events ?? [])
        setLastUpdated(data.lastUpdated ?? null)
        if (opts?.showToast) {
          toast({ title: "Refreshed", description: "Event list updated." })
        }
      } catch (err: any) {
        console.error("Error fetching events:", err)
        toast({ title: "Error", description: err?.message ?? "Failed to load events", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    },
    [
      bounds,
      filters.categories,
      filters.datePreset,
      filters.end,
      filters.price,
      filters.q,
      filters.timeOfDay,
      filters.start,
      toast,
    ],
  )

  // Sync URL when filters change
  useEffect(() => {
    updateUrl({})
  }, [filters, updateUrl])

  // Fetch on first load and whenever bounds/filters change
  useEffect(() => {
    fetchEvents()
  }, [
    bounds,
    filters.datePreset,
    filters.start,
    filters.end,
    filters.categories.join(","),
    filters.price,
    filters.timeOfDay,
    filters.q,
    fetchEvents,
  ])

  // Auto refresh timer
  useEffect(() => {
    // Only run on client side
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof window === 'undefined') return

    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    if (autoRefreshMs > 0) {
      // @ts-ignore
      refreshTimerRef.current = window.setInterval(() => {
        fetchEvents()
      }, autoRefreshMs)
    }
    return () => {
      if (refreshTimerRef.current) window.clearInterval(refreshTimerRef.current)
    }
  }, [autoRefreshMs, fetchEvents])

  const onBoundsChange = useCallback(
    (b: Bounds) => {
      setBounds(b)
      updateUrl({}, b)
    },
    [updateUrl],
  )

  const onManualRefresh = useCallback(async () => {
    // Optionally call ingest endpoint for demo; then refetch
    await fetch("/api/ingest/run", { method: "POST", body: JSON.stringify({ city: "san-francisco", dryRun: true }) })
    fetchEvents({ showToast: true })
  }, [fetchEvents])

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        right={
          <div className="flex items-center gap-2">
            <LastUpdatedBadge lastUpdated={lastUpdated} />
            <Button variant="outline" size="sm" onClick={onManualRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {"Refresh"}
            </Button>
          </div>
        }
      />
      <main className="flex-1 grid md:grid-cols-[360px_1fr]">
        {/* Left sidebar with filters and events */}
        <div className="flex flex-col h-full">
          {/* Filters section - fixed height, independent scroll */}
          <section className="border-b md:border-b-0 md:border-r bg-muted/30 flex-shrink-0">
            <div className="h-64 md:h-80 overflow-auto">
              <FiltersPanel
                value={filters}
                onChange={setFilters}
                autoRefreshMs={autoRefreshMs}
                onChangeAutoRefresh={setAutoRefreshMs}
              />
            </div>
          </section>
          
          {/* Events list section - takes remaining height, independent scroll */}
          <section className="border-b md:border-b-0 md:border-r bg-muted/30 flex-1 overflow-hidden">
            <div className="h-full overflow-auto">
              <div className="px-4 pb-4">
                <Card>
                  <CardContent className="p-0">
                    <div className="p-4 border-b">
                      <div className="text-sm text-muted-foreground">
                        {"Showing "}
                        <span className="font-medium text-foreground">{events.length}</span>
                        {" events in view"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Click any event to view details
                      </div>
                    </div>
                    <div className="p-2">
                      {loading ? (
                        <div className="space-y-3 p-2">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex gap-3">
                              <Skeleton className="h-16 w-16 rounded-md" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-3 w-1/2" />
                                <Skeleton className="h-3 w-1/3" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : events.length === 0 ? (
                        <EmptyState />
                      ) : (
                        <ul className="divide-y">
                          {events.map((ev) => (
                            <li key={ev.id}>
                              <button
                                className="w-full text-left p-3 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm transition-colors duration-200 cursor-pointer group"
                                style={{
                                  backgroundColor: selected && selected.id === ev.id ? 'var(--muted)' : undefined,
                                  boxShadow: selected && selected.id === ev.id ? '0 0 0 2px var(--ring)' : undefined
                                }}
                                onClick={() => {
                                  console.log("Event clicked:", ev.title)
                                  setSelected(ev)
                                }}
                                aria-label={`Open details for ${ev.title}`}
                              >
                                <div className="flex gap-3">
                                  <img
                                    src={
                                      ev.imageUrl ??
                                      ("/placeholder.svg?height=64&width=96&query=san%20francisco%20event%20thumbnail" ||
                                        "/placeholder.svg")
                                    }
                                    alt={ev.title}
                                    className="h-16 w-24 object-cover rounded-md border"
                                    loading="lazy"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{ev.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(ev.startsAt).toLocaleString()}
                                      {ev.venue?.name ? ` • ${ev.venue.name}` : ""}
                                    </div>
                                    <div className="mt-1 text-xs">
                                      {ev.isFree ? "Free" : formatPriceRange(ev.priceMin, ev.priceMax, ev.currency)}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </div>
        
        {/* Map section */}
        <section className="relative">
          <MapView
            events={events}
            onMarkerClick={setSelected}
            onBoundsChange={onBoundsChange}
            initialBounds={SF_DEFAULT_BOUNDS}
            loading={loading}
          />
        </section>
      </main>

      <EventDetailDrawer event={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  )
}

function formatPriceRange(min?: number | null, max?: number | null, currency?: string | null) {
  const cur = currency ?? "USD"
  const f = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 })
  if (min != null && max != null) {
    if (min === 0 && max === 0) return "Free"
    if (min === max) return f(min)
    return `${f(min)} – ${f(max)}`
  }
  if (min != null) return `${f(min)}+`
  if (max != null) return `Up to ${f(max)}`
  return "See pricing"
}
