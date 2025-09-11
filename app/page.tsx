"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { FiltersPanel, type FiltersState } from "@/components/filters-panel"
import { FiltersBar } from "@/components/filters-bar"
import { EventsPanel } from "@/components/events-panel"
import { Header } from "@/components/header"
import { LastUpdatedBadge } from "@/components/last-updated-badge"
import { EventDetailDrawer } from "@/components/event-detail-drawer"
import { ClusterEventsDrawer } from "@/components/cluster-events-drawer"
import { Button } from "@/components/ui/button"
import { RefreshCw, LocateFixed } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import type { ApiEvent, DirectionsRoute, TravelMode } from "@/lib/types"
import { buildGoogleMapsDirectionsUrl } from "@/lib/utils"

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
  const [clusterEvents, setClusterEvents] = useState<ApiEvent[]>([])
  const [showClusterDrawer, setShowClusterDrawer] = useState(false)
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(null)
  const [selectedFromCluster, setSelectedFromCluster] = useState(false)
  const [autoRefreshMs, setAutoRefreshMs] = useState<number>(0)
  const refreshTimerRef = useRef<number | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const geoWatchIdRef = useRef<number | null>(null)
  const [route, setRoute] = useState<DirectionsRoute | null>(null)
  const [routeMode, setRouteMode] = useState<TravelMode>("walking")
  const routeAbortRef = useRef<AbortController | null>(null)
  const [routeToEventId, setRouteToEventId] = useState<string | null>(null)
  const mapPanelRef = useRef<HTMLDivElement | null>(null)

  const googleMapsUrl = useMemo(() => {
    if (!selected?.venue?.lat || !selected?.venue?.lng) return null
    const dest = { lat: selected.venue.lat, lng: selected.venue.lng }
    return buildGoogleMapsDirectionsUrl(userLocation ?? undefined, dest, routeMode)
  }, [selected?.venue?.lat, selected?.venue?.lng, userLocation?.lat, userLocation?.lng, routeMode])

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
    await fetch("/api/ingest/run", { method: "POST", body: JSON.stringify({ city: "san-francisco", dryRun: false }) })
    fetchEvents({ showToast: true })
  }, [fetchEvents])

  const onClusterClick = useCallback((lat: number, lng: number, zoom: number, events: ApiEvent[]) => {
    console.log("Cluster clicked with", events.length, "events")
    setClusterEvents(events)
    setShowClusterDrawer(true)
    setSelectedClusterKey(`${lng},${lat}`)
  }, [])

  const onClusterEventClick = useCallback((event: ApiEvent) => {
    if (!routeToEventId || routeToEventId !== event.id) {
      setRoute(null)
      setRouteToEventId(null)
    }
    setSelected(event)
    setShowClusterDrawer(false)
    setSelectedFromCluster(true)
    setSelectedClusterKey(null)
  }, [routeToEventId])

  const onSelectEvent = useCallback((event: ApiEvent) => {
    if (!routeToEventId || routeToEventId !== event.id) {
      setRoute(null)
      setRouteToEventId(null)
    }
    setSelected(event)
    setSelectedFromCluster(false)
    setSelectedClusterKey(null)
  }, [routeToEventId])

  const onBackToCluster = useCallback(() => {
    setSelected(null)
    setSelectedFromCluster(false)
    setShowClusterDrawer(true)
  }, [])

  const startWatchingLocation = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!navigator.geolocation) {
      toast({ title: "Location not supported", description: "Your browser doesn't support geolocation.", variant: "destructive" })
      return
    }
    setIsLocating(true)
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        console.error("Geolocation error", err)
        setIsLocating(false)
        toast({ title: "Location unavailable", description: err.message ?? "Unable to retrieve your location.", variant: "destructive" })
        if (geoWatchIdRef.current != null) navigator.geolocation.clearWatch(geoWatchIdRef.current)
        geoWatchIdRef.current = null
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    // @ts-ignore - TS DOM lib allows number here
    geoWatchIdRef.current = id as unknown as number
  }, [toast])

  const stopWatchingLocation = useCallback(() => {
    if (typeof window === 'undefined') return
    if (geoWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current)
      geoWatchIdRef.current = null
    }
    setIsLocating(false)
    setUserLocation(null)
  }, [])

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (geoWatchIdRef.current != null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current)
        geoWatchIdRef.current = null
      }
      if (routeAbortRef.current) routeAbortRef.current.abort()
    }
  }, [])

  const fetchRoute = useCallback(async (event: ApiEvent, mode: TravelMode) => {
    if (!userLocation) {
      toast({ title: "Location needed", description: "Enable My Location to get directions.", variant: "destructive" })
      return
    }
    if (!event.venue?.lat || !event.venue?.lng) {
      toast({ title: "No coordinates", description: "Event has no location to route to.", variant: "destructive" })
      return
    }
    if (routeAbortRef.current) routeAbortRef.current.abort()
    const controller = new AbortController()
    routeAbortRef.current = controller
    try {
      const params = new URLSearchParams({
        originLat: String(userLocation.lat),
        originLng: String(userLocation.lng),
        destLat: String(event.venue.lat),
        destLng: String(event.venue.lng),
        mode,
      })
      const res = await fetch(`/api/directions?${params.toString()}`, { signal: controller.signal })
      if (!res.ok) throw new Error((await res.json())?.error || "Failed to get directions")
      const data = await res.json()
      setRoute({ ...data })
      setRouteToEventId(event.id)
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      console.error("Directions error", err)
      toast({ title: "Directions error", description: err?.message ?? "Could not fetch directions.", variant: "destructive" })
    }
  }, [userLocation, toast])

  return (
    <div className="flex h-screen flex-col">
      <Header
        right={
          <div className="flex items-center gap-2">
            <LastUpdatedBadge lastUpdated={lastUpdated} />
            <Button
              variant={isLocating ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isLocating) stopWatchingLocation(); else startWatchingLocation()
              }}
              className={isLocating ? "bg-emerald-600 text-white" : "text-black border-black/30 hover:border-black/50 bg-white"}
            >
              <LocateFixed className="h-4 w-4 mr-2" />
              {isLocating ? "Location On" : "My Location"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onManualRefresh}
              className="text-black border-black/30 hover:border-black/50 bg-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {"Refresh"}
            </Button>
          </div>
        }
      />
      <FiltersBar
        value={filters}
        onChange={setFilters}
        autoRefreshMs={autoRefreshMs}
        onChangeAutoRefresh={setAutoRefreshMs}
      />
      <main className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Events list - left */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={50}>
            <section className="border-b md:border-b-0 md:border-r bg-muted/30 h-full overflow-hidden">
              <div className="h-full overflow-auto">
                <EventsPanel
                  events={events}
                  loading={loading}
                  selectedEvent={selected}
                  onEventSelect={onSelectEvent}
                />
              </div>
            </section>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Map section */}
          <ResizablePanel>
            <section ref={mapPanelRef} className="relative h-full">
              <MapView
                events={events}
                onMarkerClick={(event) => {
                  onSelectEvent(event)
                }}
                onClusterClick={onClusterClick}
                onBoundsChange={onBoundsChange}
                initialBounds={SF_DEFAULT_BOUNDS}
                loading={loading}
                userLocation={userLocation ?? undefined}
                route={route}
                selectedEventId={selected?.id ?? null}
                selectedClusterKey={selectedClusterKey}
              />
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <EventDetailDrawer 
        event={selected} 
        open={!!selected} 
        onOpenChange={(o) => !o && setSelected(null)}
        onBackToCluster={onBackToCluster}
        showBackButton={selectedFromCluster}
        hasUserLocation={!!userLocation}
        route={route}
        routeMode={routeMode}
        onEnableLocation={() => startWatchingLocation()}
        onSetRouteMode={(m) => setRouteMode(m)}
        onGetDirections={() => selected && fetchRoute(selected, routeMode)}
        onClearRoute={() => setRoute(null)}
        portalContainer={mapPanelRef.current}
        withinContainer
        googleMapsUrl={googleMapsUrl ?? undefined}
      />
      <ClusterEventsDrawer 
        events={clusterEvents} 
        open={showClusterDrawer} 
        onOpenChange={(o) => { setShowClusterDrawer(o); if (!o) setSelectedClusterKey(null) }}
        onEventClick={onClusterEventClick}
        portalContainer={mapPanelRef.current}
        withinContainer
      />
    </div>
  )
}


