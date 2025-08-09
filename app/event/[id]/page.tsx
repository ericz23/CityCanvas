import { notFound } from "next/navigation"
import seed from "@/data/seed-events.json"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MapSnippet } from "@/components/map-snippet"

export default function EventPage({ params }: { params: { id: string } }) {
  const ev = (seed.events as any[]).find((e) => e.id === params.id)
  if (!ev) return notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto p-4 max-w-4xl">
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-4">
            <img
              src={ev.imageUrl ?? "/placeholder.svg?height=320&width=640&query=san%20francisco%20event%20hero"}
              alt={ev.title}
              className="w-full h-64 object-cover rounded-md border"
            />
            <div>
              <h1 className="text-2xl font-semibold">{ev.title}</h1>
              <div className="text-sm text-muted-foreground">
                {new Date(ev.startsAt).toLocaleString()}
                {ev.endsAt ? ` – ${new Date(ev.endsAt).toLocaleTimeString()}` : ""}
              </div>
            </div>
            {ev.description ? <p className="text-sm leading-relaxed">{ev.description}</p> : null}
          </div>
          <aside className="md:col-span-2 space-y-4">
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">{ev.venue?.name ?? "TBA"}</div>
              <div className="text-muted-foreground">{ev.venue?.address ?? ""}</div>
              <div className="mt-2">
                <MapSnippet lat={ev.venue?.lat} lng={ev.venue?.lng} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(ev.categories ?? []).map((c: string) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
              {(ev.tags ?? []).map((t: string) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {ev.ticketUrl ? (
                <Button asChild>
                  <Link href={ev.ticketUrl} target="_blank" rel="noopener">
                    {"Get Tickets"}
                  </Link>
                </Button>
              ) : null}
              {ev.source?.url ? (
                <Button variant="secondary" asChild>
                  <Link href={ev.source.url} target="_blank" rel="noopener">
                    {"Open Source"}
                  </Link>
                </Button>
              ) : null}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
