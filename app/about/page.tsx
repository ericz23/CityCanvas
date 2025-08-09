import { Header } from "@/components/header"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto p-4 prose prose-sm max-w-3xl">
        <h1>{"About"}</h1>
        <p>
          {"SF Event Tracker is a map-first interface for discovering public events in San Francisco. "}
          {"Use the filters to narrow by date, category, price, and time of day, then click pins to see details."}
        </p>
        <p>
          {
            "This demo uses static seed data and OpenStreetMap tiles. Production integrates a Postgres database, scheduled ingestion, "
          }
          {"geocoding, and LLM-assisted extraction."}
        </p>
      </main>
    </div>
  )
}
