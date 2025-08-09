"use client"

import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

export function LastUpdatedBadge({ lastUpdated }: { lastUpdated: string | null }) {
  return (
    <Badge variant="outline" className="bg-muted">
      <Clock className="h-3.5 w-3.5 mr-1.5" />
      {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleString()}` : "Updating..."}
    </Badge>
  )
}
