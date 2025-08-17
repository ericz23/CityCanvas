"use client"

import Link from "next/link"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Ticket, MapPin, Calendar, Clock, DollarSign, ArrowLeft } from "lucide-react"
import type { ApiEvent } from "@/lib/types"

export function EventDetailDrawer({
  event,
  open,
  onOpenChange,
  onBackToCluster,
  showBackButton = false,
}: {
  event: ApiEvent | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onBackToCluster?: () => void
  showBackButton?: boolean
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto animate-in slide-in-from-right duration-300 z-[1000]">
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
            <Button variant="outline" asChild className="flex-1">
              <Link href={`/event/${event.id}`}>
                Full Details
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
