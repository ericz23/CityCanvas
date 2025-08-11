import axios from 'axios'

export interface FetchedContent {
  url: string
  html: string
  statusCode: number
  contentType?: string
  lastModified?: string
  checksum: string
  fromCache: boolean
}

export class HTMLFetcher {
  private userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ]

  async fetchHTML(url: string): Promise<FetchedContent> {
    try {
      console.log(`Fetching: ${url}`)
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        timeout: 10000,
        maxRedirects: 5
      })

      const content: FetchedContent = {
        url,
        html: response.data,
        statusCode: response.status,
        contentType: response.headers['content-type'],
        lastModified: response.headers['last-modified'],
        checksum: this.generateChecksum(response.data),
        fromCache: false
      }

      console.log(`✅ Fetched ${url} (${content.html.length} chars)`)
      return content
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to fetch ${url}:`, errorMessage)
      throw new Error(`Failed to fetch ${url}: ${errorMessage}`)
    }
  }

  async fetchMultiple(urls: string[]): Promise<FetchedContent[]> {
    const results: FetchedContent[] = []
    
    for (const url of urls) {
      try {
        const content = await this.fetchHTML(url)
        results.push(content)
        
        // Add delay to be respectful
        await this.delay(1000)
        
      } catch (error) {
        console.error(`Skipping ${url} due to error`)
        // Continue with next URL instead of failing completely
      }
    }
    
    return results
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
  }

  private generateChecksum(content: string): string {
    // Simple hash for now - in production you'd use crypto
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
} 