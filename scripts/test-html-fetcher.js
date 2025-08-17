require('dotenv').config()
const axios = require('axios')

class HTMLFetcher {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  }

  async fetchHTML(url) {
    try {
      console.log(`Fetching: ${url}`)
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 10000,
        maxRedirects: 5
      })

      const content = {
        url,
        html: response.data,
        statusCode: response.status,
        contentType: response.headers['content-type'],
        htmlLength: response.data.length
      }

      console.log(`✅ Fetched ${url} (${content.htmlLength} chars)`)
      return content
      
    } catch (error) {
      console.error(`❌ Failed to fetch ${url}:`, error.message)
      return null
    }
  }

  async fetchMultiple(urls) {
    const results = []
    
    for (const url of urls) {
      const content = await this.fetchHTML(url)
      if (content) {
        results.push(content)
      }
      
      // Add delay to be respectful
      await this.delay(1000)
    }
    
    return results
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

async function testHTMLFetcher() {
  console.log('🔍 HTML Fetcher Test')
  console.log('===================\n')
  
  const htmlFetcher = new HTMLFetcher()
  
  // Test URLs
  const testUrls = [
    'https://sf.funcheap.com/events/san-francisco/',
    'https://www.eventbrite.com/d/ca--san-francisco/events--this-week/',
    'https://dothebay.com/'
  ]
  
  console.log('Testing HTML fetching with 3 sample URLs...\n')
  
  const results = await htmlFetcher.fetchMultiple(testUrls)
  
  console.log(`\n📊 Results Summary:`)
  console.log(`- Attempted: ${testUrls.length} URLs`)
  console.log(`- Successful: ${results.length} URLs`)
  console.log(`- Failed: ${testUrls.length - results.length} URLs`)
  
  if (results.length > 0) {
    console.log('\n📄 Sample Content:')
    const sample = results[0]
    console.log(`- URL: ${sample.url}`)
    console.log(`- Status: ${sample.statusCode}`)
    console.log(`- Content Type: ${sample.contentType}`)
    console.log(`- HTML Length: ${sample.htmlLength} characters`)
    console.log(`- First 200 chars: ${sample.html.substring(0, 200)}...`)
  }
  
  console.log('\n✅ Test completed!')
}

// Run the test
testHTMLFetcher().catch(console.error) 