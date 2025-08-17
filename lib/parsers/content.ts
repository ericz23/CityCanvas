import * as cheerio from 'cheerio'

export interface ParsedContent {
  url: string
  title: string
  description: string
  text: string
  jsonLd: any[]
  microdata: any[]
  meta: Record<string, string>
  links: string[]
  hasEvents: boolean
  eventKeywords: string[]
}

export class ContentParser {
  parseHTML(html: string, url: string): ParsedContent {
    const $ = cheerio.load(html)
    
    return {
      url,
      title: this.extractTitle($),
      description: this.extractDescription($),
      text: this.extractText($),
      jsonLd: this.extractJSONLD($),
      microdata: this.extractMicrodata($),
      meta: this.extractMeta($),
      links: this.extractLinks($),
      hasEvents: this.detectEvents($),
      eventKeywords: this.findEventKeywords($)
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    return $('title').text().trim() || 
           $('h1').first().text().trim() ||
           $('meta[property="og:title"]').attr('content') || ''
  }

  private extractDescription($: cheerio.CheerioAPI): string {
    return $('meta[name="description"]').attr('content') ||
           $('meta[property="og:description"]').attr('content') || ''
  }

  private extractText($: cheerio.CheerioAPI): string {
    // Remove script and style elements
    $('script, style, nav, footer, header').remove()
    
    // Extract text from body
    return $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000) // Limit to 2k chars for readability
  }

  private extractJSONLD($: cheerio.CheerioAPI): any[] {
    const jsonLd: any[] = []
    
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html()
        if (content) {
          const parsed = JSON.parse(content)
          if (Array.isArray(parsed)) {
            jsonLd.push(...parsed)
          } else {
            jsonLd.push(parsed)
          }
        }
      } catch (error) {
        console.warn('Failed to parse JSON-LD:', error)
      }
    })
    
    return jsonLd
  }

  private extractMicrodata($: cheerio.CheerioAPI): any[] {
    const microdata: any[] = []
    
    $('[itemtype*="schema.org/Event"]').each((_, el) => {
      const item: any = {}
      $(el).find('[itemprop]').each((_, propEl) => {
        const prop = $(propEl).attr('itemprop')
        const value = $(propEl).attr('content') || $(propEl).text().trim()
        if (prop && value) {
          item[prop] = value
        }
      })
      if (Object.keys(item).length > 0) {
        microdata.push(item)
      }
    })
    
    return microdata
  }

  private extractMeta($: cheerio.CheerioAPI): Record<string, string> {
    const meta: Record<string, string> = {}
    
    $('meta').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property')
      const content = $(el).attr('content')
      if (name && content) {
        meta[name] = content
      }
    })
    
    return meta
  }

  private extractLinks($: cheerio.CheerioAPI): string[] {
    const links: string[] = []
    
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (href && href.startsWith('http')) {
        links.push(href)
      }
    })
    
    return links.slice(0, 10) // Limit to first 10 links
  }

  private detectEvents($: cheerio.CheerioAPI): boolean {
    const text = $('body').text().toLowerCase()
    const eventKeywords = [
      'event', 'events', 'calendar', 'schedule', 'ticket', 'tickets',
      'concert', 'festival', 'meetup', 'conference', 'workshop',
      'exhibition', 'show', 'performance', 'party', 'celebration'
    ]
    
    return eventKeywords.some(keyword => text.includes(keyword))
  }

  private findEventKeywords($: cheerio.CheerioAPI): string[] {
    const text = $('body').text().toLowerCase()
    const eventKeywords = [
      'event', 'events', 'calendar', 'schedule', 'ticket', 'tickets',
      'concert', 'festival', 'meetup', 'conference', 'workshop',
      'exhibition', 'show', 'performance', 'party', 'celebration',
      'free', 'paid', 'registration', 'rsvp', 'admission'
    ]
    
    return eventKeywords.filter(keyword => text.includes(keyword))
  }
} 