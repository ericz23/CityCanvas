import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildGoogleMapsDirectionsUrl(
  origin: { lat: number; lng: number } | undefined,
  dest: { lat: number; lng: number },
  mode: "walking" | "driving" | "cycling"
): string {
  const travelMode = mode === "cycling" ? "bicycling" : mode
  const params = new URLSearchParams()
  params.set("api", "1")
  if (origin) params.set("origin", `${origin.lat},${origin.lng}`)
  params.set("destination", `${dest.lat},${dest.lng}`)
  params.set("travelmode", travelMode)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
