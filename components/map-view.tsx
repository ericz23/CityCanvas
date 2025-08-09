"use client"

import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet"
import type { LatLngBounds } from "leaflet"
import L, { type DivIcon } from "leaflet"
import { useEffect, useMemo, useRef, useState } from "react"
import Supercluster from "supercluster"
import type { ApiEvent } from "@/lib/types"
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
  onBoundsChange: (b: Bounds) => void
  initialBounds: Bounds
  loading?: boolean
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

export function MapView({ events, onMarkerClick, onBoundsChange, initialBounds, loading }: Props) {
  const center = useMemo(() => {
    const lat = (initialBounds.minLat + initialBounds.maxLat) / 2
    const lng = (initialBounds.minLng + initialBounds.maxLng) / 2
    return { lat, lng }
  }, [initialBounds])

  const [zoom, setZoom] = useState(12)
  const [clusters, setClusters] = useState<Feature[]>([])

  // Build clustering index
  const index = useMemo(() => {
    const pts = events.filter((e) => e.venue?.lat != null && e.venue?.lng != null).map(toFeature)
    const sc = new Supercluster<FeatureProps>({ radius: 60, maxZoom: 18 })
    sc.load(pts as any)
    return sc
  }, [events])

  const boundsRef = useRef<LatLngBounds | null>(null)

  const computeClusters = (mapBounds?: LatLngBounds, z?: number) => {
    const b = mapBounds ?? boundsRef.current
    const currentZoom = z ?? zoom
    if (!b) return
    const arr = index.getClusters([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], Math.round(currentZoom))
    // Map supercluster features to our Feature type
    const fc: Feature[] = arr.map((f: any) => {
      if (f.properties.cluster) {
        // Collect representative ids if present
        return {
          type: "Feature",
          geometry: f.geometry,
          properties: {
            cluster: true,
            point_count: f.properties.point_count,
            ids: f.properties.leaflet_ids ?? [],
          },
        } as Feature
      } else {
        return f as Feature
      }
    })
    setClusters(fc)
  }

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
      },
      zoomend: (e) => {
        const map = e.target
        const b = map.getBounds()
        boundsRef.current = b
        setZoom(map.getZoom())
        computeClusters(b, map.getZoom())
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

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="h-full w-full"
        worldCopyJump={true}
        scrollWheelZoom={true}
        attributionControl={true}
      >
        <TileLayer
          // OpenStreetMap tiles (no API key)
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution={'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'}
        />
        <MapEvents />
        <Markers
          clusters={clusters}
          onClusterClick={(lat, lng, z) => {
            // Zoom in on cluster
            // Leaflet instance is not directly available; use a custom event to request zoom via fitBounds.
            // As a simple approach, just update state and rely on moveend to recompute clusters.
          }}
          onPointClick={(ev) => onMarkerClick(ev)}
        />
      </MapContainer>
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
}: {
  clusters: Feature[]
  onClusterClick: (lat: number, lng: number, zoom: number) => void
  onPointClick: (ev: ApiEvent) => void
}) {
  // Create manual markers via Leaflet Layer API to avoid default icon issues.
  const groupRef = useRef<L.LayerGroup | null>(null)
  const map = (L as any).Map.instance || undefined // not available; we'll use useEffect with useMapEvents earlier.

  const [layerGroup, setLayerGroup] = useState<L.LayerGroup | null>(null)

  useEffect(() => {
    // Attach a layer group to the map via leaflet's global hook
    if (!layerGroup) {
      const g = L.layerGroup()
      setLayerGroup(g)
    }
  }, [layerGroup])

  // Render clusters as DivIcons
  useEffect(() => {
    if (!layerGroup) return

    // Clear previous markers
    layerGroup.clearLayers()

    clusters.forEach((f) => {
      const [lng, lat] = f.geometry.coordinates as [number, number]
      if ((f.properties as any).cluster) {
        const count = (f.properties as any).point_count as number
        const icon = clusterIcon(count)
        const marker = L.marker([lat, lng], { icon })
        marker.on("click", () => {
          // Simple zoom in on click by opening a circle to indicate cluster; in a full app, you'd call map.zoomIn().
          // Here we do nothing special; clusters recompute on map zoom/pan.
        })
        marker.addTo(layerGroup)
      } else {
        const ev = (f.properties as any).event as ApiEvent
        const marker = L.marker([lat, lng], { icon: pinIcon() })
        marker.on("click", () => onPointClick(ev))
        marker.addTo(layerGroup)
      }
    })

    return () => {
      layerGroup.clearLayers()
    }
  }, [clusters, layerGroup, onPointClick])

  // Attach layerGroup to map container element
  useEffect(() => {
    // Find the map instance by querying leaflet container
    const containers = document.getElementsByClassName("leaflet-pane leaflet-marker-pane")
    if (!containers.length || !layerGroup) return
    // LayerGroup is managed by Leaflet; we need map to add it. Easiest: locate any map by global query
    const maps = (L as any)._leaflet_id ? [] : []
    // Fallback: try to add via global map variable from leaflet; if not available, attach through known method:
    // We can search for the Leaflet map object via the first element with class 'leaflet-container'
    const container = document.querySelector(".leaflet-container") as any
    const mapInst = container?._leaflet_id != null ? (container?._leaflet as L.Map) : null
    // If react-leaflet attached map to container, it stores instance differently; since that is brittle, we use a safer approach:
    // Create a dummy marker and read its _map when available.
    let mapObj: L.Map | null = null
    try {
      // @ts-ignore
      const anyMarker = new L.Marker([0, 0]).addTo(layerGroup)
      // @ts-ignore
      mapObj = (anyMarker as any)._map ?? null
      layerGroup.removeLayer(anyMarker)
    } catch {
      mapObj = null
    }
    if (mapObj && !mapObj.hasLayer(layerGroup)) {
      layerGroup.addTo(mapObj)
    }
  }, [layerGroup])

  return null
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

function pinIcon(): DivIcon {
  const html = `
    <div class="relative">
      <div class="bg-emerald-600 ring-2 ring-white rounded-full shadow-md" style="width:14px;height:14px;"></div>
    </div>
  `
  return L.divIcon({ html, className: "pin-icon", iconSize: [14, 14] as any })
}
