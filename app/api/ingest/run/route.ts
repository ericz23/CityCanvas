import { NextResponse } from "next/server"
import { SearchClient } from "@/lib/search/client"
import { HTMLFetcher } from "@/lib/fetcher/html"
import { LLMClient } from "@/lib/llm/client"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { city = "san-francisco", dryRun = false } = body

    if (city !== "san-francisco") {
      return NextResponse.json(
        { error: "Only San Francisco is supported" },
        { status: 400 }
      )
    }

    console.log('Starting URL discovery...')
    const searchClient = new SearchClient()
    
    // Discover URLs using search
    const urls = await searchClient.discoverEventUrls()
    console.log(`Discovered ${urls.length} URLs`)
    
    // Fetch HTML content from URLs
    console.log('Starting HTML fetching...')
    const htmlFetcher = new HTMLFetcher()
    
    // Limit to first 5 URLs for testing/dry run
    const urlsToFetch = dryRun ? urls.slice(0, 5) : urls.slice(0, 20)
    const fetchedContent = await htmlFetcher.fetchMultiple(urlsToFetch)
    
    console.log(`Fetched ${fetchedContent.length} pages successfully`)
    
    // Extract events using LLM
    console.log('Starting LLM event extraction...')
    const llmClient = new LLMClient()
    const allEvents = []
    
    for (const content of fetchedContent) {
      try {
        const events = await llmClient.extractEvents(content)
        allEvents.push(...events)
        console.log(`Extracted ${events.length} events from ${content.url}`)
      } catch (error) {
        console.error(`Failed to extract events from ${content.url}:`, error)
      }
    }
    
    console.log(`Total events extracted: ${allEvents.length}`)
    
    // Save events to database (unless dry run)
    let upsertedCount = 0
    if (!dryRun && allEvents.length > 0) {
      console.log('Saving events to database...')
      
      for (const event of allEvents) {
        try {
          // Create or update source
          const source = await prisma.source.upsert({
            where: { url: event.sourceUrl },
            update: {},
            create: {
              url: event.sourceUrl,
              kind: 'BLOG',
              label: new URL(event.sourceUrl).hostname,
              lastSeen: new Date()
            }
          })
          
          // Create or update event
          await prisma.event.upsert({
            where: {
              sourceHash: `${event.title}|${event.startsAt}|${event.venueName || ''}`
            },
            update: {
              description: event.description,
              startsAt: new Date(event.startsAt),
              endsAt: event.endsAt ? new Date(event.endsAt) : null,
              venueName: event.venueName,
              address: event.address,
              priceMin: event.priceMin,
              priceMax: event.priceMax,
              currency: event.currency || 'USD',
              isFree: event.isFree,
              ticketUrl: event.ticketUrl,
              imageUrl: event.imageUrl,
              categories: event.categories,
              status: 'ACTIVE',
              updatedAt: new Date()
            },
            create: {
              title: event.title,
              description: event.description,
              startsAt: new Date(event.startsAt),
              endsAt: event.endsAt ? new Date(event.endsAt) : null,
              venueName: event.venueName,
              address: event.address,
              priceMin: event.priceMin,
              priceMax: event.priceMax,
              currency: event.currency || 'USD',
              isFree: event.isFree,
              ticketUrl: event.ticketUrl,
              imageUrl: event.imageUrl,
              categories: event.categories,
              status: 'ACTIVE',
              sourceId: source.id,
              sourceHash: `${event.title}|${event.startsAt}|${event.venueName || ''}`
            }
          })
          
          upsertedCount++
        } catch (error) {
          console.error(`Failed to save event "${event.title}":`, error)
        }
      }
    }
    
    return NextResponse.json({
      jobId: `job_${Date.now()}`,
      city,
      dryRun,
      discovered: urls.length,
      fetched: fetchedContent.length,
      extracted: allEvents.length,
      upserted: upsertedCount,
      summary: `Discovered ${urls.length} URLs, fetched ${fetchedContent.length} pages, extracted ${allEvents.length} events, upserted ${upsertedCount} events`,
      sampleEvents: dryRun ? allEvents.slice(0, 3) : undefined
    })
  } catch (error) {
    console.error('Ingestion failed:', error)
    return NextResponse.json(
      { error: 'Ingestion failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
