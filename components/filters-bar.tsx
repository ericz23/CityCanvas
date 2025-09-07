"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { X, Calendar, Filter, DollarSign, Clock, RefreshCw, ChevronDown } from "lucide-react"
import { FieldTriggerButton } from "@/components/ui/field-trigger"
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

export function FiltersBar(props: {
  value: FiltersState
  onChange: (v: FiltersState) => void
  autoRefreshMs: number
  onChangeAutoRefresh: (ms: number) => void
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
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

  const selectedCategoryCount = useMemo(() => v.categories.length, [v.categories])

  const hasActiveFilters = useMemo(() => {
    return (
      v.datePreset !== "3d" ||
      v.start !== "" ||
      v.end !== "" ||
      v.categories.length > 0 ||
      v.price !== "any" ||
      v.timeOfDay !== "any" ||
      v.q !== ""
    )
  }, [v])

  const clearAllFilters = () => {
    props.onChange({
      datePreset: "3d",
      start: "",
      end: "",
      categories: [],
      price: "any",
      timeOfDay: "any",
      q: "",
    })
  }

  return (
    <div className="sticky top-0 z-[1500] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="px-4 md:px-6 py-3 flex flex-wrap items-center gap-2 md:gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-[520px]">
          <Input
            placeholder="Search title, venue, description"
            value={v.q}
            onChange={(e) => props.onChange({ ...v, q: e.target.value })}
            aria-label="Search events"
          />
        </div>

        {/* Date preset */}
        <div className="flex items-center gap-1">
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <FieldTriggerButton aria-label="Choose date range">
                <Calendar className="h-4 w-4 mr-2" />
                {dateLabel(v)}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </FieldTriggerButton>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <ToggleChip
                    selected={v.datePreset === "today"}
                    onClick={() => props.onChange({ ...v, datePreset: "today" })}
                  >
                    Today
                  </ToggleChip>
                  <ToggleChip
                    selected={v.datePreset === "3d"}
                    onClick={() => props.onChange({ ...v, datePreset: "3d" })}
                  >
                    Next 3 days
                  </ToggleChip>
                  <ToggleChip
                    selected={v.datePreset === "7d"}
                    onClick={() => props.onChange({ ...v, datePreset: "7d" })}
                  >
                    Next 7 days
                  </ToggleChip>
                  <ToggleChip
                    selected={v.datePreset === "custom"}
                    onClick={() => props.onChange({ ...v, datePreset: "custom" })}
                  >
                    Custom
                  </ToggleChip>
                </div>
                {v.datePreset === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="start">Start</Label>
                      <Input
                        id="start"
                        type="datetime-local"
                        value={v.start}
                        onChange={(e) => props.onChange({ ...v, start: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end">End</Label>
                      <Input
                        id="end"
                        type="datetime-local"
                        value={v.end}
                        onChange={(e) => props.onChange({ ...v, end: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1">
          <Popover open={categoriesOpen} onOpenChange={setCategoriesOpen}>
            <PopoverTrigger asChild>
              <FieldTriggerButton aria-label="Filter categories">
                <Filter className="h-4 w-4 mr-2" />
                Categories
                {selectedCategoryCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{selectedCategoryCount}</Badge>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </FieldTriggerButton>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <Command>
                <CommandInput placeholder="Search categories..." />
                <CommandList>
                  <CommandEmpty>No categories found.</CommandEmpty>
                  <CommandGroup>
                    {categories.map((c) => {
                      const checked = v.categories.includes(c.slug)
                      return (
                        <CommandItem key={c.slug} onSelect={() => toggleCategory(c.slug, v, props.onChange)}>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(chk) => toggleCategory(c.slug, v, props.onChange, !!chk)}
                              aria-label={`Category ${c.name}`}
                            />
                            <span>{c.name}</span>
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Price */}
        <div className="shrink-0">
          <Select value={v.price} onValueChange={(val) => props.onChange({ ...v, price: val as FiltersState["price"] })}>
            <SelectTrigger className="h-9 font-medium">
              <DollarSign className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Price</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="lt20">{"< $20"}</SelectItem>
              <SelectItem value="20to50">{"$20–$50"}</SelectItem>
              <SelectItem value="gt50">{"$50+"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Time of day */}
        <div className="shrink-0">
          <Select value={v.timeOfDay} onValueChange={(val) => props.onChange({ ...v, timeOfDay: val as FiltersState["timeOfDay"] })}>
            <SelectTrigger className="h-9 font-medium">
              <Clock className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Time of day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Time</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="afternoon">Afternoon</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
              <SelectItem value="late">Late</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Auto refresh */}
        <div className="shrink-0">
          <Select value={String(props.autoRefreshMs)} onValueChange={(val) => props.onChangeAutoRefresh(Number(val))}>
            <SelectTrigger className="h-9 font-medium">
              <RefreshCw className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Auto refresh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Auto Refresh Off</SelectItem>
              <SelectItem value={`${5 * 60 * 1000}`}>Every 5 min</SelectItem>
              <SelectItem value={`${15 * 60 * 1000}`}>Every 15 min</SelectItem>
              <SelectItem value={`${60 * 60 * 1000}`}>Every hour</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} aria-label="Clear all filters">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}

function toggleCategory(slug: string, v: FiltersState, onChange: (v: FiltersState) => void, force?: boolean) {
  const next = new Set(v.categories)
  const shouldAdd = force != null ? force : !next.has(slug)
  if (shouldAdd) next.add(slug)
  else next.delete(slug)
  onChange({ ...v, categories: Array.from(next) })
}

function ToggleChip(props: { selected?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      className={cn(
        "text-sm rounded-md border px-3 py-1.5 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        props.selected ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-input",
      )}
      onClick={props.onClick}
      type="button"
    >
      {props.children}
    </button>
  )
}

function dateLabel(v: FiltersState) {
  switch (v.datePreset) {
    case "today":
      return "Today"
    case "3d":
      return "Next 3 days"
    case "7d":
      return "Next 7 days"
    case "custom":
      if (v.start && v.end) return "Custom range"
      return "Custom"
  }
}


