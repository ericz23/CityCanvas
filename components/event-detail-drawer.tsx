"use client"

import Link from "next/link"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Ticket, MapPin, Calendar, Clock, DollarSign, ArrowLeft, Bike, Car, Footprints } from "lucide-react"
import type { ApiEvent, DirectionsRoute, TravelMode } from "@/lib/types"

export function EventDetailDrawer({
  event,
  open,
  onOpenChange,
  onBackToCluster,
  showBackButton = false,
  hasUserLocation = false,
  route,
  routeMode = "walking",
  onEnableLocation,
  onSetRouteMode,
  onGetDirections,
  onClearRoute,
  portalContainer,
  withinContainer,
  onCenterOnSelected,
  googleMapsUrl,
}: {
  event: ApiEvent | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onBackToCluster?: () => void
  showBackButton?: boolean
  hasUserLocation?: boolean
  route?: DirectionsRoute | null
  routeMode?: TravelMode
  onEnableLocation?: () => void
  onSetRouteMode?: (m: TravelMode) => void
  onGetDirections?: () => void
  onClearRoute?: () => void
  portalContainer?: HTMLElement | null
  withinContainer?: boolean
  onCenterOnSelected?: () => void
  googleMapsUrl?: string
}) {
  if (!event) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatPrice = () => {
    if (event.isFree) return "Free"
    if (event.priceMin != null && event.priceMax != null) {
      if (event.priceMin === event.priceMax) {
        return `$${event.priceMin}`
      }
      return `$${event.priceMin} - $${event.priceMax}`
    }
    if (event.priceMin != null) return `From $${event.priceMin}`
    if (event.priceMax != null) return `Up to $${event.priceMax}`
    return "See pricing"
  }

  const fmtDistance = (m: number) => {
    if (!Number.isFinite(m)) return "–"
    // show km for > 1km, else meters
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
    return `${Math.round(m)} m`
  }
  const fmtDuration = (s: number) => {
    if (!Number.isFinite(s)) return "–"
    const mins = Math.round(s / 60)
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60)
    const rem = mins % 60
    return `${h} hr${h > 1 ? "s" : ""}${rem ? ` ${rem} min` : ""}`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" portalContainer={portalContainer} withinContainer={withinContainer} overlayPassThrough className="w-full sm:w-2/5 min-w-[20rem] max-w-none sm:max-w-none overflow-y-auto animate-in slide-in-from-right duration-300 z-[1000]">
        <div className="space-y-6 p-6">
          {showBackButton && onBackToCluster && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToCluster}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          )}
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-bold">{event.title}</SheetTitle>
            <div className="text-base text-muted-foreground space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(event.startsAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatTime(event.startsAt)}</span>
                {event.endsAt && (
                  <>
                    <span>to</span>
                    <span>{formatTime(event.endsAt)}</span>
                  </>
                )}
              </div>
            </div>
          </SheetHeader>
          <div>
            <Button size="sm" variant="outline" onClick={() => onCenterOnSelected?.()}>
              Center on selected
            </Button>
          </div>

          {event.imageUrl && (
            <div className="relative">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-64 object-cover rounded-lg border shadow-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {event.venue && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Location</span>
                  </div>
                  <div className="pl-6">
                    <div className="font-medium">{event.venue.name || "TBA"}</div>
                    {event.venue.address && (
                      <div className="text-sm text-muted-foreground">{event.venue.address}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Price</span>
                </div>
                <div className="pl-6">
                  <div className="font-medium">{formatPrice()}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {(event.categories?.length || event.tags?.length) && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Categories & Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {(event.categories ?? []).map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                    {(event.tags ?? []).map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {event.sourceConfidence != null && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Data Confidence</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round((event.sourceConfidence) * 100)}% confident
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          {event.description && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <p className="text-sm leading-relaxed text-foreground">{event.description}</p>
            </div>
          )}

          {/* Directions */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Directions</div>
              <div className="flex items-center gap-1">
                <button
                  className={`px-2 py-1 rounded text-xs border ${routeMode === 'walking' ? 'bg-black text-white' : 'bg-white hover:bg-muted/70'}`}
                  onClick={() => onSetRouteMode?.('walking')}
                >
                  <Footprints className="h-3 w-3 inline mr-1" /> Walk
                </button>
                <button
                  className={`px-2 py-1 rounded text-xs border ${routeMode === 'cycling' ? 'bg-black text-white' : 'bg-white hover:bg-muted/70'}`}
                  onClick={() => onSetRouteMode?.('cycling')}
                >
                  <Bike className="h-3 w-3 inline mr-1" /> Bike
                </button>
                <button
                  className={`px-2 py-1 rounded text-xs border ${routeMode === 'driving' ? 'bg-black text-white' : 'bg-white hover:bg-muted/70'}`}
                  onClick={() => onSetRouteMode?.('driving')}
                >
                  <Car className="h-3 w-3 inline mr-1" /> Drive
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {!hasUserLocation ? (
                <>
                  <div className="text-xs text-muted-foreground">Enable location to get directions.</div>
                  <Button size="sm" variant="outline" onClick={() => onEnableLocation?.()}>Use My Location</Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => onGetDirections?.()}>
                    Get Directions
                  </Button>
                  {route && (
                    <Button size="sm" variant="ghost" onClick={() => onClearRoute?.()}>Clear route</Button>
                  )}
                </>
              )}
              {googleMapsUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={googleMapsUrl} target="_blank" rel="noopener" title="Open in Google Maps">
                    Open in Google Maps
                  </a>
                </Button>
              )}
            </div>
            {route && (
              <div className="rounded border bg-muted/30 p-3 text-sm">
                <div className="font-medium mb-2">{fmtDuration(route.duration)} • {fmtDistance(route.distance)}</div>
                <ol className="space-y-1 list-decimal pl-5 max-h-40 overflow-auto">
                  {route.steps.slice(0, 12).map((s, i) => (
                    <li key={i} className="text-muted-foreground">
                      {s.instruction} <span className="text-xs">({fmtDistance(s.distance)})</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            {event.ticketUrl && (
              <Button asChild className="flex-1">
                <Link href={event.ticketUrl} target="_blank" rel="noopener">
                  <Ticket className="h-4 w-4 mr-2" />
                  Get Tickets
                </Link>
              </Button>
            )}
            {event.source?.url && (
              <Button variant="secondary" asChild className="flex-1">
                <Link href={event.source.url} target="_blank" rel="noopener">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Source
                </Link>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
