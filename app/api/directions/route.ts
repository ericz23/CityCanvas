import { NextResponse } from "next/server"

function parseFloatParam(v: string | null) {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function profileForMode(mode: string) {
  // OSRM public demo expects: driving | walking | cycling
  if (mode === "walking") return "walking"
  if (mode === "cycling") return "cycling"
  return "driving" // default
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const originLat = parseFloatParam(url.searchParams.get("originLat"))
    const originLng = parseFloatParam(url.searchParams.get("originLng"))
    const destLat = parseFloatParam(url.searchParams.get("destLat"))
    const destLng = parseFloatParam(url.searchParams.get("destLng"))
    const mode = (url.searchParams.get("mode") ?? "walking") as "walking" | "driving" | "cycling"

    if (originLat == null || originLng == null || destLat == null || destLng == null) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 })
    }

    const profile = profileForMode(mode)
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true&annotations=false&alternatives=false`

    console.log("[directions] requesting", { mode, profile, osrmUrl })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(osrmUrl, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({ error: "Routing failed" }, { status: 502 })
    }
    const data = await res.json()
    if (!data?.routes?.length) {
      return NextResponse.json({ error: "No route found" }, { status: 404 })
    }

    const route = data.routes[0]
    const coordsLngLat: Array<[number, number]> = route.geometry.coordinates
    const coordinates: Array<[number, number]> = coordsLngLat.map(([lng, lat]: [number, number]) => [lat, lng])

    const steps: Array<{ instruction: string; distance: number; duration: number }> = []
    const legs = route.legs ?? []
    for (const leg of legs) {
      for (const step of leg.steps ?? []) {
        const maneuver = step.maneuver || {}
        const roadName = step.name || ""
        const type = maneuver.type || ""
        const modifier = maneuver.modifier ? ` ${maneuver.modifier}` : ""
        const base = type ? type.replace(/_/g, " ") : "continue"
        const instruction = roadName ? `${base}${modifier} on ${roadName}` : `${base}${modifier}`
        steps.push({ instruction, distance: step.distance || 0, duration: step.duration || 0 })
      }
    }

    return NextResponse.json({
      coordinates,
      distance: route.distance,
      duration: route.duration,
      steps,
      mode,
      profile,
    })
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError'
    return NextResponse.json({ error: isAbort ? "Routing timed out" : "Routing error" }, { status: 500 })
  }
}


