"use client"

import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import type { ApiEvent } from "@/lib/types"

export type EventsPanelProps = {
  events: ApiEvent[]
  loading: boolean
  selectedEvent: ApiEvent | null
  onEventSelect: (event: ApiEvent) => void
}

export function EventsPanel({ events, loading, selectedEvent, onEventSelect }: EventsPanelProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{"Events"}</h2>
        <Badge variant="secondary">
          {events.length} {"events"}
        </Badge>
      </div>

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
                        backgroundColor: selectedEvent && selectedEvent.id === ev.id ? 'var(--muted)' : undefined,
                        boxShadow: selectedEvent && selectedEvent.id === ev.id ? '0 0 0 2px var(--ring)' : undefined
                      }}
                      onClick={() => {
                        console.log("Event clicked:", ev.title)
                        onEventSelect(ev)
                      }}
                      aria-label={`Open details for ${ev.title}`}
                    >
                      <div className={ev.imageUrl ? "flex gap-3" : ""}>
                        {ev.imageUrl && (
                          <img
                            src={ev.imageUrl}
                            alt={ev.title}
                            className="h-16 w-24 object-cover rounded-md border flex-shrink-0"
                            loading="lazy"
                          />
                        )}
                        <div className={ev.imageUrl ? "flex-1" : ""}>
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