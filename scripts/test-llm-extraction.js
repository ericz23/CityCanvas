require('dotenv').config()
const axios = require('axios')
const cheerio = require('cheerio')
const OpenAI = require('openai')

// Simple HTML Fetcher
class HTMLFetcher {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  }

  async fetchHTML(url) {
    try {
      console.log(`Fetching: ${url}`)
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgents[0],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 10000,
        maxRedirects: 5
      })

      return {
        url,
        html: response.data,
        statusCode: response.status,
        htmlLength: response.data.length
      }
      
    } catch (error) {
      console.error(`❌ Failed to fetch ${url}:`, error.message)
      return null
    }
  }
}

// LLM Client
class LLMClient {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async extractEvents(content) {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not configured')
      return []
    }

    try {
      console.log(`🤖 Extracting events from: ${content.url}`)
      
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

  getSystemPrompt() {
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

  buildPrompt(html, url) {
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

  cleanHTML(html) {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

// Main test function
async function testLLMExtraction() {
  console.log('🤖 LLM Event Extraction Test')
  console.log('============================\n')
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not found in environment variables')
    console.log('Please add OPENAI_API_KEY=your_key_here to your .env.local file')
    console.log('Get your key from: https://platform.openai.com/api-keys')
    return
  }
  
  console.log('✅ OPENAI_API_KEY found\n')
  
  const htmlFetcher = new HTMLFetcher()
  const llmClient = new LLMClient()
  
  // Test URLs that are likely to have events
  const testUrls = [
    'https://sf.funcheap.com/events/san-francisco/',
    'https://www.eventbrite.com/d/ca--san-francisco/events--this-week/',
    'https://dothebay.com/'
  ]
  
  console.log('Testing LLM extraction with 3 event websites...\n')
  
  for (const url of testUrls) {
    console.log(`\n🔗 Processing: ${url}`)
    console.log('─'.repeat(60))
    
    // Step 1: Fetch HTML
    const content = await htmlFetcher.fetchHTML(url)
    if (!content) {
      console.log('❌ Failed to fetch content, skipping...')
      continue
    }
    
    console.log(`📄 Fetched ${content.htmlLength} characters`)
    
    // Step 2: Extract events with LLM
    const events = await llmClient.extractEvents(content)
    
    if (events.length > 0) {
      console.log(`\n🎉 Found ${events.length} events:`)
      events.forEach((event, index) => {
        console.log(`\n  Event ${index + 1}:`)
        console.log(`    Title: ${event.title}`)
        console.log(`    Date: ${event.startsAt}`)
        console.log(`    Venue: ${event.venueName || 'Unknown'}`)
        console.log(`    Price: ${event.isFree ? 'Free' : `${event.priceMin || 'Unknown'}`}`)
        console.log(`    Categories: ${event.categories.join(', ')}`)
        if (event.description) {
          console.log(`    Description: ${event.description.substring(0, 100)}...`)
        }
      })
    } else {
      console.log('❌ No events found')
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.log('\n✅ LLM extraction test completed!')
}

// Run the test
testLLMExtraction().catch(console.error) 