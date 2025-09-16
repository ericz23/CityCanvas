"use client"

import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, useMapEvents, Marker, useMap, Polyline } from "react-leaflet"
import type { LatLngBounds } from "leaflet"
import L, { type DivIcon } from "leaflet"
import { useEffect, useMemo, useRef, useState } from "react"
import Supercluster from "supercluster"
import type { ApiEvent, DirectionsRoute } from "@/lib/types"
import type { GeoJSON } from "geojson"

type Bounds = {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

type Props = {
  events: ApiEvent[]
  onMarkerClick: (ev: ApiEvent) => void
  onClusterClick: (lat: number, lng: number, zoom: number, events: ApiEvent[]) => void
  onBoundsChange: (b: Bounds) => void
  initialBounds: Bounds
  loading?: boolean
  userLocation?: { lat: number; lng: number }
  route?: DirectionsRoute | null
  selectedEventId?: string | null
  selectedClusterKey?: string | null
  recenterNonce?: number
}

type FeatureProps = { cluster: true; point_count: number; ids: string[] } | { cluster: false; event: ApiEvent }
type Feature = GeoJSON.Feature<GeoJSON.Point, FeatureProps>

function toFeature(ev: ApiEvent): Feature {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [ev.venue?.lng ?? 0, ev.venue?.lat ?? 0],
    },
    properties: { cluster: false, event: ev } as FeatureProps,
  }
}

// Wrapper component to handle SSR
function MapViewWrapper(props: Props) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    )
  }

  return <MapViewComponent {...props} />
}

function MapViewComponent({ events, onMarkerClick, onClusterClick, onBoundsChange, initialBounds, loading, userLocation, route, selectedEventId, selectedClusterKey, recenterNonce }: Props) {
  const center = useMemo(() => {
    const lat = (initialBounds.minLat + initialBounds.maxLat) / 2
    const lng = (initialBounds.minLng + initialBounds.maxLng) / 2
    return { lat, lng }
  }, [initialBounds])

  const [zoom, setZoom] = useState(12)
  const [clusters, setClusters] = useState<Feature[]>([])
  const [useSFBBox, setUseSFBBox] = useState(true)
  const mapRef = useRef<L.Map | null>(null)
  const hasFitRouteRef = useRef(false)
  const lastCenteredEventIdRef = useRef<string | null>(null)
  const lastCenteredClusterKeyRef = useRef<string | null>(null)
  const originalViewRef = useRef<{ center: L.LatLng; zoom: number } | null>(null)
  const hasSnapshotRef = useRef(false)
  const userInteractedSinceSnapshotRef = useRef(false)
  const isProgrammaticMoveRef = useRef(false)

  const isOutsideSF = useMemo(() => {
    if (!userLocation) return false
    const { lat, lng } = userLocation
    return (
      lat < initialBounds.minLat ||
      lat > initialBounds.maxLat ||
      lng < initialBounds.minLng ||
      lng > initialBounds.maxLng
    )
  }, [userLocation, initialBounds])

  // Build clustering index
  const index = useMemo(() => {
    const pts = events.filter((e) => e.venue?.lat != null && e.venue?.lng != null).map(toFeature)
    const sc = new Supercluster<FeatureProps>({ radius: 40, maxZoom: 18 })
    sc.load(pts as any)
    return sc
  }, [events])

  const boundsRef = useRef<LatLngBounds | null>(null)

  // Fit to route once when a new route is set
  useEffect(() => {
    if (!mapRef.current) return
    if (!route || !route.coordinates?.length) {
      hasFitRouteRef.current = false
      return
    }
    if (hasFitRouteRef.current) return
    const latLngs = route.coordinates.map(([lat, lng]) => L.latLng(lat, lng))
    const b = L.latLngBounds(latLngs)
    mapRef.current.fitBounds(b, { padding: [24, 24] })
    hasFitRouteRef.current = true
  }, [route])

  const computeClusters = (mapBounds?: LatLngBounds, z?: number) => {
    const b = mapBounds ?? boundsRef.current
    const currentZoom = z ?? zoom
    if (!b) return
    
    // Get all points with coordinates for indexing
    const pointsWithCoords = events.filter((e) => e.venue?.lat != null && e.venue?.lng != null)
    
    const arr = index.getClusters([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], Math.round(currentZoom))
    
    // Map supercluster features to our Feature type
    const fc: Feature[] = arr.map((f: any) => {
      if (f.properties.cluster) {
        // Get the exact events that belong to this cluster using Supercluster's data
        const clusterEvents: ApiEvent[] = []
        const leafletIds = f.properties.leaflet_ids ?? []
        
        // Use the cluster's actual point indices to get the correct events
        if (f.properties.cluster_id !== undefined) {
          // Get the leaves (individual points) that make up this cluster
          const leaves = index.getLeaves(f.properties.cluster_id, Infinity)
          const processedCoords = new Set<string>()
          
          leaves.forEach((leaf: any) => {
            // Find the corresponding event by matching coordinates
            const leafCoords = leaf.geometry.coordinates
            const coordKey = `${leafCoords[0]},${leafCoords[1]}`
            
            // Find all events at this coordinate (not just the first one)
            const matchingEvents = pointsWithCoords.filter(event => 
              event.venue?.lat === leafCoords[1] && event.venue?.lng === leafCoords[0]
            )
            
            // Only process each unique coordinate once to avoid duplicates
            if (!processedCoords.has(coordKey)) {
              processedCoords.add(coordKey)
              clusterEvents.push(...matchingEvents)
            }
          })
        }
        
        return {
          type: "Feature",
          geometry: f.geometry,
          properties: {
            cluster: true,
            point_count: f.properties.point_count,
            ids: leafletIds,
            events: clusterEvents,
          },
        } as Feature
      } else {
        return f as Feature
      }
    })
    setClusters(fc)
  }

  // Recompute clusters when the clustering index updates and the map is ready
  useEffect(() => {
    if (!mapRef.current) return
    const b = mapRef.current.getBounds()
    boundsRef.current = b
    const currentZoom = mapRef.current.getZoom()
    computeClusters(b, currentZoom)
  }, [index])

  // Center map on selected event when selection changes (only once per selection)
  useEffect(() => {
    if (!selectedEventId) {
      lastCenteredEventIdRef.current = null
      return
    }
    if (lastCenteredEventIdRef.current === selectedEventId) return
    if (!mapRef.current) return
    // Snapshot original view before first recenter
    if (!hasSnapshotRef.current) {
      const currentCenter = mapRef.current.getCenter()
      const currentZoom = mapRef.current.getZoom()
      originalViewRef.current = { center: currentCenter, zoom: currentZoom }
      hasSnapshotRef.current = true
    }
    const ev = events.find(e => e.id === selectedEventId)
    const lat = ev?.venue?.lat
    const lng = ev?.venue?.lng
    if (lat == null || lng == null) return
    const current = mapRef.current.getZoom()
    const targetZoom = Math.max(current ?? 12, 13)
    isProgrammaticMoveRef.current = true
    mapRef.current.setView([lat, lng], targetZoom, { animate: true })
    lastCenteredEventIdRef.current = selectedEventId
  }, [selectedEventId, events])

  // Restore original view when both event and cluster selections clear
  useEffect(() => {
    if (selectedEventId != null || selectedClusterKey != null) return
    if (!mapRef.current) return
    if (!hasSnapshotRef.current || !originalViewRef.current) {
      lastCenteredEventIdRef.current = null
      lastCenteredClusterKeyRef.current = null
      return
    }
    if (!userInteractedSinceSnapshotRef.current) {
      const { center, zoom } = originalViewRef.current
      isProgrammaticMoveRef.current = true
      mapRef.current.setView(center, zoom, { animate: true })
    }
    originalViewRef.current = null
    hasSnapshotRef.current = false
    userInteractedSinceSnapshotRef.current = false
    lastCenteredEventIdRef.current = null
    lastCenteredClusterKeyRef.current = null
  }, [selectedEventId, selectedClusterKey])

  // Center map on selected cluster when cluster selection changes (simple center+zoom)
  useEffect(() => {
    if (!selectedClusterKey) {
      lastCenteredClusterKeyRef.current = null
      return
    }
    if (!mapRef.current) return
    if (lastCenteredClusterKeyRef.current === selectedClusterKey) return
    // Snapshot original view before first recenter (if not already snapshotted by event selection)
    if (!hasSnapshotRef.current) {
      const currentCenter = mapRef.current.getCenter()
      const currentZoom = mapRef.current.getZoom()
      originalViewRef.current = { center: currentCenter, zoom: currentZoom }
      hasSnapshotRef.current = true
    }
    const [lngStr, latStr] = selectedClusterKey.split(",")
    const lat = Number(latStr)
    const lng = Number(lngStr)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const current = mapRef.current.getZoom()
    const targetZoom = Math.max(current ?? 12, 13)
    isProgrammaticMoveRef.current = true
    mapRef.current.setView([lat, lng], targetZoom, { animate: true })
    lastCenteredClusterKeyRef.current = selectedClusterKey
  }, [selectedClusterKey])

  // Manual recenter requests (from drawers)
  useEffect(() => {
    if (!recenterNonce) return
    if (!mapRef.current) return
    // Prefer event if present, else cluster
    if (selectedEventId) {
      const ev = events.find(e => e.id === selectedEventId)
      const lat = ev?.venue?.lat
      const lng = ev?.venue?.lng
      if (lat != null && lng != null) {
        const current = mapRef.current.getZoom()
        const targetZoom = Math.max(current ?? 12, 13)
        isProgrammaticMoveRef.current = true
        mapRef.current.setView([lat, lng], targetZoom, { animate: true })
        return
      }
    }
    if (selectedClusterKey) {
      const [lngStr, latStr] = selectedClusterKey.split(",")
      const lat = Number(latStr)
      const lng = Number(lngStr)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const current = mapRef.current.getZoom()
        const targetZoom = Math.max(current ?? 12, 13)
        isProgrammaticMoveRef.current = true
        mapRef.current.setView([lat, lng], targetZoom, { animate: true })
      }
    }
  }, [recenterNonce])

  function MapEvents() {
    useMapEvents({
      moveend: (e) => {
        const map = e.target
        const b = map.getBounds()
        boundsRef.current = b
        onBoundsChange({
          minLng: b.getWest(),
          minLat: b.getSouth(),
          maxLng: b.getEast(),
          maxLat: b.getNorth(),
        })
        setZoom(map.getZoom())
        computeClusters(b, map.getZoom())
        if (isProgrammaticMoveRef.current) {
          isProgrammaticMoveRef.current = false
        } else if (hasSnapshotRef.current) {
          userInteractedSinceSnapshotRef.current = true
        }
      },
      zoomend: (e) => {
        const map = e.target
        const b = map.getBounds()
        boundsRef.current = b
        setZoom(map.getZoom())
        computeClusters(b, map.getZoom())
        if (isProgrammaticMoveRef.current) {
          isProgrammaticMoveRef.current = false
        } else if (hasSnapshotRef.current) {
          userInteractedSinceSnapshotRef.current = true
        }
      },
      load: (e) => {
        const map = e.target
        const b = map.getBounds()
        boundsRef.current = b
        computeClusters(b, map.getZoom())
      },
    })
    return null
  }

  function MapController({ onReady }: { onReady: (map: L.Map) => void }) {
    const map = useMap()
    useEffect(() => {
      onReady(map)
    }, [map, onReady])
    return null
  }

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="h-full w-full"
        worldCopyJump={false}
        scrollWheelZoom={true}
        attributionControl={true}
        maxBounds={useSFBBox ? (
          [
            [36.6, -122.8], // Southwest bounds (Monterey area, inland from ocean)
            [38.6, -121.8]  // Northeast bounds (Sacramento area, eastern bound near Livermore)
          ]
        ) : undefined}
        maxBoundsViscosity={1.0}
        minZoom={8}
        maxZoom={18}
      >
        <TileLayer
          // OpenStreetMap tiles (no API key)
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution={'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'}
        />
        <MapController onReady={(m) => { mapRef.current = m }} />
        <MapEvents />
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userDotIcon()}
            interactive={false}
          />
        )}
        {route && route.coordinates?.length ? (
          <Polyline
            positions={route.coordinates.map(([lat, lng]) => [lat, lng]) as any}
            pathOptions={{ color: "#3b82f6", weight: 5, opacity: 0.85 }}
          />
        ) : null}
        <Markers
          clusters={clusters}
          onClusterClick={onClusterClick}
          onPointClick={(ev) => onMarkerClick(ev)}
          selectedEventId={selectedEventId ?? null}
          selectedClusterKey={selectedClusterKey ?? null}
        />
      </MapContainer>
      {userLocation && isOutsideSF && useSFBBox && (
        <div className="absolute right-2 top-2 z-[500] flex items-center gap-2 rounded-md bg-background/90 backdrop-blur border px-2 py-1 text-xs shadow-sm">
          <span className="text-muted-foreground">You're outside SF</span>
          <button
            className="px-2 py-0.5 rounded border bg-white hover:bg-muted/70 transition"
            onClick={() => {
              setUseSFBBox(false)
              if (mapRef.current) {
                const { lat, lng } = userLocation
                // Slight delay to ensure bounds are relaxed before recenter
                setTimeout(() => mapRef.current?.setView([lat, lng], 14), 0)
              }
            }}
          >
            View my location
          </button>
        </div>
      )}
      {!useSFBBox && (
        <div className="absolute right-2 top-2 z-[500] flex items-center gap-2 rounded-md bg-background/90 backdrop-blur border px-2 py-1 text-xs shadow-sm">
          <button
            className="px-2 py-0.5 rounded border bg-white hover:bg-muted/70 transition"
            onClick={() => {
              setUseSFBBox(true)
              if (mapRef.current) {
                const sw: [number, number] = [initialBounds.minLat, initialBounds.minLng]
                const ne: [number, number] = [initialBounds.maxLat, initialBounds.maxLng]
                // Fit the SF bounds again
                setTimeout(() => mapRef.current?.fitBounds([sw, ne] as any, { animate: true }), 0)
              }
            }}
          >
            Back to SF
          </button>
        </div>
      )}
      {loading && (
        <div className="absolute left-2 top-2 z-[500] rounded-md bg-background/80 backdrop-blur border px-2 py-1 text-xs">
          {"Loading events..."}
        </div>
      )}
    </div>
  )
}

function Markers({
  clusters,
  onClusterClick,
  onPointClick,
  selectedEventId,
  selectedClusterKey,
}: {
  clusters: Feature[]
  onClusterClick: (lat: number, lng: number, zoom: number, events: ApiEvent[]) => void
  onPointClick: (ev: ApiEvent) => void
  selectedEventId: string | null
  selectedClusterKey: string | null
}) {
  
  return (
    <>
      {clusters.map((f, index) => {
        const [lng, lat] = f.geometry.coordinates as [number, number]
        
        if ((f.properties as any).cluster) {
          const count = (f.properties as any).point_count as number
          const clusterEvents = (f.properties as any).events as ApiEvent[] || []
          const containsSelected = selectedEventId != null && clusterEvents.some(e => e.id === selectedEventId)
          const isExplicitlySelected = selectedClusterKey != null && `${lng},${lat}` === selectedClusterKey
          return (
            <Marker
              key={`cluster-${index}`}
              position={[lat, lng]}
              icon={(containsSelected || isExplicitlySelected) ? selectedClusterIcon(count) : clusterIcon(count)}
              zIndexOffset={(containsSelected || isExplicitlySelected) ? 900 : 0}
              eventHandlers={{
                click: () => {
                  console.log("Cluster clicked with", count, "points")
                  onClusterClick(lat, lng, 15, clusterEvents)
                }
              }}
            />
          )
        } else {
          const ev = (f.properties as any).event as ApiEvent
          const isSelected = selectedEventId != null && ev.id === selectedEventId
          return (
            <Marker
              key={`event-${ev.id}`}
              position={[lat, lng]}
              icon={isSelected ? selectedPinIcon() : pinIcon()}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{
                click: () => {
                  console.log("Event marker clicked:", ev.title)
                  onPointClick(ev)
                }
              }}
            />
          )
        }
      })}
    </>
  )
}

function clusterIcon(count: number): DivIcon {
  const size = count < 10 ? 28 : count < 50 ? 34 : 42
  const bg = count < 10 ? "bg-emerald-500" : count < 50 ? "bg-emerald-600" : "bg-emerald-700"
  const ring = "ring-2 ring-white"
  const html = `
    <div class="${bg} ${ring} text-white rounded-full flex items-center justify-center shadow-md"
         style="width:${size}px;height:${size}px;font-size:12px;">
      ${count}
    </div>
  `
  return L.divIcon({ html, className: "cluster-icon", iconSize: [size, size] as any })
}

function selectedClusterIcon(count: number): DivIcon {
  const size = count < 10 ? 28 : count < 50 ? 34 : 42
  const ring = "ring-2 ring-white"
  const html = `
    <div class="bg-blue-600 ${ring} text-white rounded-full flex items-center justify-center shadow-md"
         style="width:${size}px;height:${size}px;font-size:12px;">
      ${count}
    </div>
  `
  return L.divIcon({ html, className: "cluster-icon-selected", iconSize: [size, size] as any })
}

function pinIcon(): DivIcon {
  const html = `
    <div class="relative cursor-pointer">
      <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="#dc2626"/>
        <circle cx="12" cy="12" r="6" fill="white"/>
        <circle cx="12" cy="12" r="4" fill="#dc2626"/>
      </svg>
    </div>
  `
  return L.divIcon({ 
    html, 
    className: "pin-icon", 
    iconSize: [24, 32] as any,
    iconAnchor: [12, 32] as any,
    popupAnchor: [0, -32] as any
  })
}

function selectedPinIcon(): DivIcon {
  const html = `
    <div class="relative cursor-pointer">
      <svg width="28" height="36" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            @keyframes pulse { 0% { transform: scale(1); opacity: 0.6; } 70% { transform: scale(1.6); opacity: 0; } 100% { transform: scale(1.6); opacity: 0; } }
          </style>
        </defs>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="#2563eb"/>
        <circle cx="12" cy="12" r="6" fill="white"/>
        <circle cx="12" cy="12" r="4" fill="#2563eb"/>
      </svg>
      <span style="position:absolute;left:50%;top:100%;width:8px;height:8px;margin-left:-4px;border-radius:9999px;background:#2563eb;opacity:.6"></span>
      <span style="position:absolute;left:50%;top:100%;width:8px;height:8px;margin-left:-4px;border-radius:9999px;background:#2563eb;animation:pulse 1.5s ease-out infinite"></span>
    </div>
  `
  return L.divIcon({ 
    html, 
    className: "pin-icon-selected", 
    iconSize: [28, 36] as any,
    iconAnchor: [14, 36] as any,
    popupAnchor: [0, -36] as any
  })
}

function userDotIcon(): DivIcon {
  const size = 14
  const html = `
    <div class="relative">
      <div class="bg-blue-500 rounded-full ring-2 ring-white shadow-md" style="width:${size}px;height:${size}px;"></div>
    </div>
  `
  return L.divIcon({ html, className: "user-dot-icon", iconSize: [size, size] as any })
}

// Export the wrapper component
export { MapViewWrapper as MapView }
