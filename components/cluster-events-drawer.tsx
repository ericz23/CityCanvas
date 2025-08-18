"use client"

import Link from "next/link"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Ticket, MapPin, Calendar, Clock, DollarSign, X } from "lucide-react"
import type { ApiEvent } from "@/lib/types"

export function ClusterEventsDrawer({
  events,
  open,
  onOpenChange,
  onEventClick,
}: {
  events: ApiEvent[]
  open: boolean
  onOpenChange: (o: boolean) => void
  onEventClick: (event: ApiEvent) => void
}) {
  if (!events || events.length === 0) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  const formatPrice = (event: ApiEvent) => {
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

  const venueName = events[0]?.venue?.name || "Multiple venues"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto animate-in slide-in-from-right duration-300 z-[1000]">
        <div className="space-y-6 p-6">
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-bold">
              {events.length} Events near {venueName}
            </SheetTitle>
            <div className="text-base text-muted-foreground mt-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{venueName}</span>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-4">
            {events.map((event, index) => (
              <div
                key={event.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onEventClick(event)}
              >
                <div className="flex gap-4">
                  {event.imageUrl && (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-20 h-20 object-cover rounded-md border"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <h3 className="font-medium text-lg leading-tight">{event.title}</h3>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(event.startsAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(event.startsAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatPrice(event)}</span>
                      </div>
                    </div>

                    {event.categories && event.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {event.categories.slice(0, 3).map((category) => (
                          <Badge key={category} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                        {event.categories.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{event.categories.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {event.ticketUrl && (
                        <Button size="sm" variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                          <Link href={event.ticketUrl} target="_blank" rel="noopener">
                            <Ticket className="h-3 w-3 mr-1" />
                            Tickets
                          </Link>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 