"use client"

import type React from "react"

import Link from "next/link"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

export function Header(props: { right?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("flex h-14 items-center justify-between border-b bg-background px-4", props.className)}>
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <MapPin className="h-5 w-5 text-emerald-600" />
        <span>{"SF Event Tracker"}</span>
      </Link>
      <nav className="hidden md:flex items-center gap-4 text-sm">
        <Link href="/" className="text-foreground/80 hover:text-foreground">
          {"Map"}
        </Link>
        <Link href="/about" className="text-foreground/80 hover:text-foreground">
          {"About"}
        </Link>
      </nav>
      <div className="flex items-center gap-2">{props.right}</div>
    </header>
  )
}
