"use client"

import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, Marker } from "react-leaflet"
import L from "leaflet"

export function MapSnippet({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  if (lat == null || lng == null) {
    return <div className="text-xs text-muted-foreground">{"Location not available"}</div>
  }
  const icon = L.divIcon({
    html: `<div class="bg-emerald-600 ring-2 ring-white rounded-full shadow-md" style="width:12px;height:12px;"></div>`,
    className: "pin-icon",
    iconSize: [12, 12] as any,
  })
  return (
    <div className="h-40 w-full rounded-md overflow-hidden border">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        className="h-full w-full"
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={icon} />
      </MapContainer>
    </div>
  )
}
