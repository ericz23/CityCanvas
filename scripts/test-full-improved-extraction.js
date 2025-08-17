require('dotenv').config()
const axios = require('axios')
const cheerio = require('cheerio')
const OpenAI = require('openai')

// HTML Fetcher
class HTMLFetcher {
  async fetchHTML(url) {
    try {
      console.log(`Fetching: ${url}`)
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 10000,
        maxRedirects: 5
      })

      return {
        url,
        html: response.data,
        htmlLength: response.data.length
      }
      
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error.message)
      return null
    }
  }
}

// Event Post Extractor
class EventPostExtractor {
  extractEventPosts(html) {
    const $ = cheerio.load(html)
    const posts = []
    
    // Find all post elements - use broader selectors to catch all posts
    $('.post, .entry, .event, .event-item, .event-card, [class*="post"], [class*="event"], [class*="entry"]').each((index, element) => {
      const $el = $(element)
      
      // Extract title - try multiple approaches to get clean text
      let title = ''
      
      // First try: look for bookmark links (these often contain the clean title)
      const bookmarkLink = $el.find('a[rel="bookmark"]').first()
      if (bookmarkLink.length > 0) {
        title = bookmarkLink.text().trim()
      }
      
      // Second try: look for heading elements
      if (!title) {
        title = $el.find('h1, h2, h3, h4, .title, .event-title, .post-title').first().text().trim()
      }
      
      // Third try: look for any link with meaningful text
      if (!title) {
        const links = $el.find('a')
        for (let i = 0; i < links.length; i++) {
          const linkText = $(links[i]).text().trim()
          if (linkText && linkText.length > 10 && linkText.length < 200) {
            title = linkText
            break
          }
        }
      }
      
      const description = $el.find('.description, .excerpt, .summary, .content, p').first().text().trim()
      const allText = $el.text().replace(/\s+/g, ' ').trim()
      
      // Only include posts that have a meaningful title (not HTML, not too short)
      if (title && 
          title.length > 5 && 
          title.length < 200 && 
          !title.includes('<') && 
          !title.includes('>') &&
          !title.includes('img') &&
          !title.includes('src=')) {
        posts.push({
          title,
          description: description || null,
          fullText: allText,
          html: $el.html()
        })
      }
    })
    
    // Remove duplicates based on title
    const uniquePosts = posts.filter((post, index, self) => 
      index === self.findIndex(p => p.title === post.title)
    )
    
    console.log(`Found ${posts.length} total posts, ${uniquePosts.length} unique posts`)
    
    return uniquePosts
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
      console.log('OPENAI_API_KEY not configured')
      return []
    }

    try {
      console.log(`Extracting events from: ${content.url}`)
      
      // First, extract individual event posts
      const postExtractor = new EventPostExtractor()
      const posts = postExtractor.extractEventPosts(content.html)
      console.log(`Found ${posts.length} event posts`)
      
      // Limit to first 30 posts to avoid rate limits
      const postsToProcess = posts.slice(0, 30)
      console.log(`Processing first ${postsToProcess.length} posts`)
      
      // Process each post individually
      const events = []
      
      for (let i = 0; i < postsToProcess.length; i++) {
        const post = postsToProcess[i]
        console.log(`Processing post ${i + 1}/${postsToProcess.length}: ${post.title}`)
        
        const event = await this.extractEventFromPost(post, content.url)
        if (event) {
          events.push(event)
        }
        
        // Small delay to avoid rate limiting
        await this.delay(500)
      }
      
      console.log(`✅ Extracted ${events.length} events from ${content.url}`)
      return events
    } catch (error) {
      console.error('LLM extraction failed:', error)
      return []
    }
  }

  async extractEventFromPost(post, sourceUrl) {
    try {
      const prompt = this.buildPostPrompt(post, sourceUrl)
      
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
        max_tokens: 1000
      })

      const result = response.choices[0]?.message?.content
      if (!result) {
        return null
      }

      try {
        const parsed = JSON.parse(result)
        const event = parsed.event
        if (event) {
          event.sourceUrl = sourceUrl
          return event
        }
      } catch (error) {
        console.error('Failed to parse LLM response for post:', error)
      }
    } catch (error) {
      console.error('LLM extraction failed for post:', error)
    }
    
    return null
  }

  getSystemPrompt() {
    return `You are an expert at extracting event information from individual event posts. 

Extract event data and output it as valid JSON following this exact schema:

{
  "event": {
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
    "categories": ["array of strings"]
  }
}

IMPORTANT RULES:
1. Only extract events that are happening in San Francisco or the Bay Area
2. Only extract future events (not past events)
3. Convert all times to America/Los_Angeles timezone
4. If you can't determine a field, use null
5. Don't hallucinate - only extract what's clearly stated
6. Return valid JSON only - no other text
7. Map categories to these slugs: music, festival, parade, food, arts, tech, sports, family, market, community
8. If no valid event found, return {"event": null}`
  }

  buildPostPrompt(post, sourceUrl) {
    return `SOURCE_URL: ${sourceUrl}

EVENT POST CONTENT:
Title: ${post.title}
Description: ${post.description || 'N/A'}
Full Text: ${post.fullText.substring(0, 2000)}

Extract event information from this post. Look for:
- Event title and description
- Date and time information
- Venue or location
- Pricing information (FREE, $XX, etc.)
- Event type or category

JSON SCHEMA:
{
  "type": "object",
  "properties": {
    "event": {
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
        "categories": {"type": "array", "items": {"type": "string"}}
      }
    }
  },
  "required": ["event"]
}

Return JSON only.`
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

async function testFullImprovedExtraction() {
  console.log('🤖 Testing Full Improved LLM Extraction')
  console.log('=======================================\n')
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not found')
    return
  }
  
  console.log('✅ OPENAI_API_KEY found\n')
  
  const htmlFetcher = new HTMLFetcher()
  const llmClient = new LLMClient()
  
  const url = 'https://sf.funcheap.com/events/san-francisco/'
  
  console.log(`🔗 Processing: ${url}`)
  console.log('─'.repeat(60))
  
  const content = await htmlFetcher.fetchHTML(url)
  if (!content) {
    console.log('❌ Failed to fetch content')
    return
  }
  
  console.log(`📄 Fetched ${content.htmlLength} characters`)
  
  const events = await llmClient.extractEvents(content)
  
  console.log(`\n🎉 Final Results:`)
  console.log(`  Events extracted: ${events.length}`)
  
  if (events.length > 0) {
    console.log('\n📋 Extracted Events:')
    events.forEach((event, index) => {
      console.log(`\n  Event ${index + 1}:`)
      console.log(`    Title: ${event.title}`)
      console.log(`    Date: ${event.startsAt}`)
      console.log(`    Venue: ${event.venueName || 'Unknown'}`)
      console.log(`    Price: ${event.isFree ? 'Free' : `${event.priceMin || 'Unknown'}`}`)
      console.log(`    Categories: ${event.categories.join(', ')}`)
    })
  }
  
  console.log('\n✅ Test completed!')
}

testFullImprovedExtraction().catch(console.error) 