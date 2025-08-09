"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type Category = { slug: string; name: string }
type Tag = { slug: string; name: string }

export type FiltersState = {
  datePreset: "today" | "3d" | "7d" | "custom"
  start: string
  end: string
  categories: string[]
  price: "any" | "free" | "lt20" | "20to50" | "gt50"
  timeOfDay: "any" | "morning" | "afternoon" | "evening" | "late"
  q: string
}

export function FiltersPanel(props: {
  value: FiltersState
  onChange: (v: FiltersState) => void
  autoRefreshMs: number
  onChangeAutoRefresh: (ms: number) => void
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const v = props.value

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/categories", { cache: "no-store" })
      const data = await res.json()
      setCategories(data.categories ?? [])
      setTags(data.tags ?? [])
    }
    load()
  }, [])

  const selectedCount = useMemo(() => v.categories.length, [v.categories])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{"Filters"}</h2>
        {selectedCount > 0 ? (
          <Badge variant="secondary">
            {selectedCount} {"selected"}
          </Badge>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{"Date range"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <ToggleChip
              selected={v.datePreset === "today"}
              onClick={() => props.onChange({ ...v, datePreset: "today" })}
            >
              {"Today"}
            </ToggleChip>
            <ToggleChip selected={v.datePreset === "3d"} onClick={() => props.onChange({ ...v, datePreset: "3d" })}>
              {"Next 3 days"}
            </ToggleChip>
            <ToggleChip selected={v.datePreset === "7d"} onClick={() => props.onChange({ ...v, datePreset: "7d" })}>
              {"Next 7 days"}
            </ToggleChip>
            <ToggleChip
              selected={v.datePreset === "custom"}
              onClick={() => props.onChange({ ...v, datePreset: "custom" })}
            >
              {"Custom"}
            </ToggleChip>
          </div>
          {v.datePreset === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="start">{"Start"}</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={v.start}
                  onChange={(e) => props.onChange({ ...v, start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end">{"End"}</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={v.end}
                  onChange={(e) => props.onChange({ ...v, end: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{"Categories"}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {categories.map((c) => {
            const checked = v.categories.includes(c.slug)
            return (
              <label
                key={c.slug}
                className={cn(
                  "flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50",
                  checked && "border-emerald-600",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(checked) => {
                    const next = new Set(v.categories)
                    if (checked) next.add(c.slug)
                    else next.delete(c.slug)
                    props.onChange({ ...v, categories: Array.from(next) })
                  }}
                  aria-label={`Category ${c.name}`}
                />
                <span className="text-sm">{c.name}</span>
              </label>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{"Price & Time"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(["any", "free", "lt20", "20to50", "gt50"] as FiltersState["price"][]).map((p) => (
              <ToggleChip key={p} selected={v.price === p} onClick={() => props.onChange({ ...v, price: p })}>
                {priceLabel(p)}
              </ToggleChip>
            ))}
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2">
            {(["any", "morning", "afternoon", "evening", "late"] as FiltersState["timeOfDay"][]).map((t) => (
              <ToggleChip key={t} selected={v.timeOfDay === t} onClick={() => props.onChange({ ...v, timeOfDay: t })}>
                {timeOfDayLabel(t)}
              </ToggleChip>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{"Search"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            placeholder="Search title, venue, description"
            value={v.q}
            onChange={(e) => props.onChange({ ...v, q: e.target.value })}
            aria-label="Search text"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{"Auto refresh"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Select value={String(props.autoRefreshMs)} onValueChange={(val) => props.onChangeAutoRefresh(Number(val))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Off" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{"Off"}</SelectItem>
              <SelectItem value={`${5 * 60 * 1000}`}>{"Every 5 minutes"}</SelectItem>
              <SelectItem value={`${15 * 60 * 1000}`}>{"Every 15 minutes"}</SelectItem>
              <SelectItem value={`${60 * 60 * 1000}`}>{"Every hour"}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" onClick={() => props.onChangeAutoRefresh(0)}>
            {"Stop"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ToggleChip(props: { selected?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      className={cn(
        "text-sm rounded-md border px-3 py-2 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        props.selected ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-input",
      )}
      onClick={props.onClick}
      type="button"
    >
      {props.children}
    </button>
  )
}

function priceLabel(p: FiltersState["price"]) {
  switch (p) {
    case "any":
      return "Any"
    case "free":
      return "Free"
    case "lt20":
      return "< $20"
    case "20to50":
      return "$20–$50"
    case "gt50":
      return "$50+"
  }
}

function timeOfDayLabel(t: FiltersState["timeOfDay"]) {
  switch (t) {
    case "any":
      return "Any time"
    case "morning":
      return "Morning"
    case "afternoon":
      return "Afternoon"
    case "evening":
      return "Evening"
    case "late":
      return "Late"
  }
}
