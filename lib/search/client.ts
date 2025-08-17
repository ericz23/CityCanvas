import axios from 'axios'

export interface SearchResult {
  url: string
  title: string
  snippet: string
  source: string
}

export class SearchClient {
  private serpApiKey: string | undefined

  constructor() {
    this.serpApiKey = process.env.SERPAPI_KEY
  }

  async searchEvents(query: string): Promise<SearchResult[]> {
    if (!this.serpApiKey) {
      console.warn('SERPAPI_KEY not configured')
      return []
    }

    try {
      return await this.searchWithSerpAPI(query)
    } catch (error) {
      console.error(`Search failed for query "${query}":`, error)
      return []
    }
  }

  private async searchWithSerpAPI(query: string): Promise<SearchResult[]> {
    if (!this.serpApiKey) return []

    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: this.serpApiKey,
          engine: 'google',
          location: 'San Francisco, CA',
          num: 20
        },
        timeout: 10000
      })

      const results = response.data.organic_results || []
      return results.map((result: any) => ({
        url: result.link,
        title: result.title,
        snippet: result.snippet,
        source: this.extractDomain(result.link)
      }))
    } catch (error) {
      console.error('SerpAPI search failed:', error)
      return []
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return 'unknown'
    }
  }

  // Method to get all unique URLs from multiple search queries
  async discoverEventUrls(): Promise<string[]> {
    const { SEARCH_CONFIG } = await import('./config')
    const allUrls = new Set<string>()
    
    for (const query of SEARCH_CONFIG.queries) {
      try {
        console.log(`Searching for: ${query}`)
        const results = await this.searchEvents(query)
        results.forEach(result => allUrls.add(result.url))
        
        // Add delay to respect rate limits
        await this.delay(1000)
      } catch (error) {
        console.error(`Search failed for query "${query}":`, error)
      }
    }
    
    return Array.from(allUrls).slice(0, SEARCH_CONFIG.maxTotalResults)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
} 