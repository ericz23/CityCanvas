import { Header } from "@/components/header"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="relative isolate h-[32rem] md:h-[48rem]">
        <Image
          src="/sf-skyline.jpg"
          alt="San Francisco skyline"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-transparent" />
        <div className="relative container mx-auto px-6 h-full flex items-center justify-center">
          <div className="max-w-3xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">About SF Event Tracker</h1>
            <p className="mt-4 text-white/90 text-lg md:text-xl">
              One place to discover concerts, parades, festivals, and more — on a live, interactive map of San Francisco.
            </p>
            <div className="mt-8 flex items-center justify-center">
              <Link href="/">
                <Button size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">Open the Map</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <main className="container mx-auto px-6 py-12 md:pt-16 max-w-4xl">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs uppercase tracking-wide text-muted-foreground bg-secondary px-2 py-1 rounded">What it is</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="prose prose-lg max-w-none text-black-700 leading-relaxed">
            <p className="text-xl leading-8 text-muted-foreground text-pretty">
              SF Event Tracker is a simple way to discover what's happening in San Francisco — all in one place. Instead of digging through dozens of calendars, blogs, and ticket sites, we bring together concerts, parades, food festivals, community gatherings, and more onto a single, interactive map.
            </p>
          </div>
        </section>

        <section className="mt-10 md:mt-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs uppercase tracking-wide text-muted-foreground bg-secondary px-2 py-1 rounded">How it works</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="prose prose-lg max-w-none text-black-700 leading-relaxed">
            <p className="text-xl leading-8 text-muted-foreground text-pretty">
              Our app automatically scans reliable sources on the web, organizes the details, and updates them regularly. Every event is pinned to its real location, so you can explore the city visually and plan your time with ease. Filters for categories, dates, and price make it simple to find the events that match your interests — whether you're looking for a free outdoor concert this weekend or a tech meetup next month.
            </p>
          </div>
        </section>

        <section className="mt-10 md:mt-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs uppercase tracking-wide text-muted-foreground bg-secondary px-2 py-1 rounded">Why it matters</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="prose prose-lg max-w-none text-black-700 leading-relaxed">
            <p className="text-xl leading-8 text-muted-foreground text-pretty">
              This project started with San Francisco, but the vision is bigger: a real-time, map-based guide to public life in cities everywhere. By combining automation with clean design, we aim to make discovering local events effortless, fun, and visually engaging.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
