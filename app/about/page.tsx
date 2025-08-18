import { Header } from "@/components/header"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-8">
          {/* Main heading */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              About
            </h1>
          </div>

          {/* Content sections */}
          <div className="prose prose-lg max-w-none space-y-6 text-black-700 leading-relaxed">
            <p className="text-xl leading-8">
              SF Event Tracker is a simple way to discover what's happening in San Francisco — all in one place.
              Instead of digging through dozens of calendars, blogs, and ticket sites, we bring together concerts, parades, food festivals, community gatherings, and more onto a single, interactive map.
            </p>

            <p className="text-xl leading-8">
              Our app automatically scans reliable sources on the web, organizes the details, and updates them regularly. Every event is pinned to its real location, so you can explore the city visually and plan your time with ease. Filters for categories, dates, and price make it simple to find the events that match your interests — whether you're looking for a free outdoor concert this weekend or a tech meetup next month.
            </p>

            <p className="text-xl leading-8">
              This project started with San Francisco, but the vision is bigger: a real-time, map-based guide to public life in cities everywhere. By combining automation with clean design, we aim to make discovering local events effortless, fun, and visually engaging.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
