import { NextResponse } from "next/server"
import { SearchClient } from "@/lib/search/client"
import { HTMLFetcher } from "@/lib/fetcher/html"

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
    
    // For now, just return the raw HTML content since ContentParser was removed
    console.log('Content parsing disabled - ContentParser was removed')
    
    return NextResponse.json({
      jobId: `job_${Date.now()}`,
      city,
      dryRun,
      discovered: urls.length,
      fetched: fetchedContent.length,
      parsed: 0,
      upserted: 0,
      summary: `Discovered ${urls.length} URLs, fetched ${fetchedContent.length} pages (parsing disabled)`,
      statistics: {
        pagesWithEvents: 0,
        totalJsonLd: 0,
        totalMicrodata: 0,
        averageEventKeywords: 0
      },
      sampleContent: dryRun && fetchedContent.length > 0 ? {
        url: fetchedContent[0]?.url,
        htmlLength: fetchedContent[0]?.html?.length || 0,
        statusCode: fetchedContent[0]?.statusCode
      } : undefined
    })
  } catch (error) {
    console.error('Ingestion failed:', error)
    return NextResponse.json(
      { error: 'Ingestion failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
