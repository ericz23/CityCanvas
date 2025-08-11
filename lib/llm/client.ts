import OpenAI from 'openai'

export interface ExtractedEvent {
  title: string
  description?: string | null
  startsAt: string
  endsAt?: string | null
  venueName?: string | null
  address?: string | null
  priceMin?: number | null
  priceMax?: number | null
  currency?: string | null
  isFree: boolean
  ticketUrl?: string | null
  imageUrl?: string | null
  categories: string[]
  sourceUrl: string
}

export class LLMClient {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async extractEvents(content: { html: string; url: string }): Promise<ExtractedEvent[]> {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not configured')
      return []
    }

    try {
      console.log(`Extracting events from: ${content.url}`)
      
      const prompt = this.buildPrompt(content.html, content.url)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })

      const result = response.choices[0]?.message?.content
      if (!result) {
        console.log('No response from LLM')
        return []
      }

      try {
        const parsed = JSON.parse(result)
        const events = parsed.events || []
        console.log(`✅ Extracted ${events.length} events from ${content.url}`)
        return events
      } catch (error) {
        console.error('Failed to parse LLM response:', error)
        console.log('Raw response:', result)
        return []
      }
    } catch (error) {
      console.error('LLM extraction failed:', error)
      return []
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert at extracting public event information from web pages. 

Your task is to extract event data and output it as valid JSON following this exact schema:

{
  "events": [
    {
      "title": "string (required)",
      "description": "string or null",
      "startsAt": "ISO 8601 date-time string (required)",
      "endsAt": "ISO 8601 date-time string or null", 
      "venueName": "string or null",
      "address": "string or null",
      "priceMin": "number or null",
      "priceMax": "number or null",
      "currency": "string or null (default: USD)",
      "isFree": "boolean",
      "ticketUrl": "string or null",
      "imageUrl": "string or null",
      "categories": ["array of strings"],
      "sourceUrl": "string (the original URL)"
    }
  ]
}

IMPORTANT RULES:
1. Only extract events that are happening in San Francisco or the Bay Area
2. Only extract future events (not past events)
3. Convert all times to America/Los_Angeles timezone
4. If you can't determine a field, use null
5. Don't hallucinate - only extract what's clearly stated
6. Return valid JSON only - no other text
7. Map categories to these slugs: music, festival, parade, food, arts, tech, sports, family, market, community
8. If no events found, return {"events": []}`
  }

  private buildPrompt(html: string, url: string): string {
    // Clean the HTML to focus on content
    const cleanHtml = this.cleanHTML(html)
    
    return `SOURCE_URL: ${url}

CONTENT (truncated):
${cleanHtml.substring(0, 8000)}

JSON SCHEMA:
{
  "type": "object",
  "properties": {
    "events": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "startsAt"],
        "properties": {
          "title": {"type": "string"},
          "description": {"type": ["string", "null"]},
          "startsAt": {"type": "string", "format": "date-time"},
          "endsAt": {"type": ["string", "null"], "format": "date-time"},
          "venueName": {"type": ["string", "null"]},
          "address": {"type": ["string", "null"]},
          "priceMin": {"type": ["number", "null"]},
          "priceMax": {"type": ["number", "null"]},
          "currency": {"type": ["string", "null"]},
          "isFree": {"type": "boolean"},
          "ticketUrl": {"type": ["string", "null"], "format": "uri"},
          "imageUrl": {"type": ["string", "null"], "format": "uri"},
          "categories": {"type": "array", "items": {"type": "string"}},
          "sourceUrl": {"type": "string", "format": "uri"}
        }
      }
    }
  },
  "required": ["events"]
}

Return JSON only.`
  }

  private cleanHTML(html: string): string {
    // Simple HTML cleaning - remove scripts, styles, and excessive whitespace
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
} 