"use client"

import type React from "react"

import Link from "next/link"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

export function Header(props: { right?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("grid grid-cols-[1fr_auto_1fr] items-center h-16 bg-black text-white px-6 shadow-lg", props.className)}>
      <Link href="/" className="flex items-center gap-3 font-bold text-lg tracking-tight">
        <MapPin className="h-6 w-6 text-emerald-400" />
        <span className="font-sans">{"SF Event Tracker"}</span>
      </Link>
      <nav className="hidden md:flex items-center gap-6 text-base font-medium justify-self-center">
        <Link href="/" className="text-white/90 hover:text-white transition-colors duration-200">
          {"Map"}
        </Link>
        <Link href="/about" className="text-white/90 hover:text-white transition-colors duration-200">
          {"About"}
        </Link>
      </nav>
      <div className="flex items-center gap-2 justify-self-end">{props.right}</div>
    </header>
  )
}
