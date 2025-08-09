"use client"

import { Card, CardContent } from "@/components/ui/card"

export function EmptyState() {
  return (
    <Card variant="outline">
      <CardContent className="p-6 text-sm text-muted-foreground">
        {"No events match your filters in the current map area. Try zooming out or adjusting filters."}
      </CardContent>
    </Card>
  )
}
