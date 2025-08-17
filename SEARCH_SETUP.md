# Search API Client Setup

This document explains how to set up the Search API Client for discovering event URLs.

## Required API Key

You need a SerpAPI key:

### SerpAPI
- Sign up at [serpapi.com](https://serpapi.com)
- Get your API key from the dashboard
- Add to `.env.local`: `SERPAPI_KEY=your_key_here`

## Usage

### Basic Usage
```typescript
import { SearchClient } from '@/lib/search/client'

const searchClient = new SearchClient()

// Search for a single query
const results = await searchClient.searchEvents('events san francisco this week')
console.log(`Found ${results.length} results`)

// Discover URLs from all configured queries
const urls = await searchClient.discoverEventUrls()
console.log(`Discovered ${urls.length} unique URLs`)
```

### What Each Result Contains
```typescript
interface SearchResult {
  url: string      // The webpage URL
  title: string    // Page title from search results
  snippet: string  // Text snippet/description
  source: string   // Domain name (e.g., "eventbrite.com")
}
```

## Testing

Run the test script:
```bash
npx ts-node scripts/test-search.ts
```

## Configuration

Edit `lib/search/config.ts` to modify:
- Search queries
- Maximum results per query
- Total maximum results
- Preferred sources

## Rate Limits

The client includes built-in delays (1 second between queries) to respect SerpAPI rate limits. Adjust as needed for your API plan. 