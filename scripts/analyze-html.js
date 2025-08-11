require('dotenv').config()
const axios = require('axios')
const cheerio = require('cheerio')

class HTMLAnalyzer {
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

  analyzeHTML(content) {
    const $ = cheerio.load(content.html)
    
    console.log(`\n📊 HTML Analysis for: ${content.url}`)
    console.log('─'.repeat(60))
    console.log(`Total HTML length: ${content.htmlLength} characters`)
    
    // Remove scripts and styles to get clean text
    $('script, style').remove()
    const cleanText = $.text().replace(/\s+/g, ' ').trim()
    console.log(`Clean text length: ${cleanText.length} characters`)
    
    // Look for common event-related patterns
    const eventPatterns = [
      /event/gi,
      /concert/gi,
      /festival/gi,
      /show/gi,
      /performance/gi,
      /ticket/gi,
      /venue/gi,
      /date/gi,
      /time/gi,
      /price/gi
    ]
    
    console.log('\n🔍 Event-related word frequencies:')
    eventPatterns.forEach(pattern => {
      const matches = cleanText.match(pattern)
      const count = matches ? matches.length : 0
      console.log(`  ${pattern.source}: ${count}`)
    })
    
    // Look for potential event containers
    const potentialEventSelectors = [
      '.event',
      '.events',
      '[class*="event"]',
      '[id*="event"]',
      '.listing',
      '.item',
      '.card',
      '.tile',
      'article',
      '.post',
      '.entry'
    ]
    
    console.log('\n🏷️ Potential event containers:')
    potentialEventSelectors.forEach(selector => {
      const elements = $(selector)
      if (elements.length > 0) {
        console.log(`  ${selector}: ${elements.length} elements`)
      }
    })
    
    // Look for date/time patterns
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/gi,
      /\b\d{1,2}:\d{2}\s*(AM|PM)\b/gi,
      /\b\d{1,2}:\d{2}\b/g
    ]
    
    console.log('\n📅 Date/time patterns found:')
    datePatterns.forEach(pattern => {
      const matches = cleanText.match(pattern)
      if (matches && matches.length > 0) {
        console.log(`  ${pattern.source}: ${matches.length} matches`)
        console.log(`    Examples: ${matches.slice(0, 5).join(', ')}`)
      }
    })
    
    // Show first 1000 characters of clean text
    console.log('\n📝 First 1000 characters of clean text:')
    console.log(cleanText.substring(0, 1000))
    console.log('...')
    
    return {
      cleanTextLength: cleanText.length,
      eventWordCount: eventPatterns.reduce((total, pattern) => {
        const matches = cleanText.match(pattern)
        return total + (matches ? matches.length : 0)
      }, 0)
    }
  }
}

async function analyzeEventWebsites() {
  console.log('🔍 HTML Structure Analysis for Event Websites')
  console.log('=============================================\n')
  
  const analyzer = new HTMLAnalyzer()
  
  const testUrls = [
    'https://sf.funcheap.com/events/san-francisco/',
    'https://www.eventbrite.com/d/ca--san-francisco/events--this-week/',
    'https://dothebay.com/'
  ]
  
  for (const url of testUrls) {
    const content = await analyzer.fetchHTML(url)
    if (!content) {
      console.log('❌ Failed to fetch content, skipping...')
      continue
    }
    
    const analysis = analyzer.analyzeHTML(content)
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.log('\n✅ HTML analysis completed!')
}

analyzeEventWebsites().catch(console.error) 