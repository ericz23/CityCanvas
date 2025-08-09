"use client"

import Link from "next/link"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Ticket } from "lucide-react"
import type { ApiEvent } from "@/lib/types"

export function EventDetailDrawer({
  event,
  open,
  onOpenChange,
}: {
  event: ApiEvent | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {event ? (
          <div className="space-y-4">
            <SheetHeader>
              <SheetTitle>{event.title}</SheetTitle>
              <SheetDescription>
                {new Date(event.startsAt).toLocaleString()}
                {event.endsAt ? ` – ${new Date(event.endsAt).toLocaleTimeString()}` : ""}
              </SheetDescription>
            </SheetHeader>
            <img
              src={event.imageUrl ?? "/placeholder.svg?height=240&width=480&query=san%20francisco%20event%20hero"}
              alt={event.title}
              className="w-full h-40 object-cover rounded-md border"
            />
            <div className="text-sm">
              <div className="font-medium">{event.venue?.name ?? "TBA"}</div>
              <div className="text-muted-foreground">{event.venue?.address ?? ""}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(event.categories ?? []).map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
              {(event.tags ?? []).map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
              <Badge variant="outline">
                {"Conf."} {Math.round((event.sourceConfidence ?? 0) * 100)}
                {"%"}
              </Badge>
            </div>
            {event.description ? <p className="text-sm leading-relaxed">{event.description}</p> : null}
            <div className="flex items-center gap-2">
              {event.ticketUrl ? (
                <Button asChild>
                  <Link href={event.ticketUrl} target="_blank" rel="noopener">
                    <Ticket className="h-4 w-4 mr-2" />
                    {"Get Tickets"}
                  </Link>
                </Button>
              ) : null}
              {event.source?.url ? (
                <Button variant="secondary" asChild>
                  <Link href={event.source.url} target="_blank" rel="noopener">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {"Open Source"}
                  </Link>
                </Button>
              ) : null}
              <Button variant="outline" asChild>
                <Link href={`/event/${event.id}`}>{"Open Details"}</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
