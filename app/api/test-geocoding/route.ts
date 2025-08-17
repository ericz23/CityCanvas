import { NextResponse } from "next/server"
import { GeocodingClient } from "@/lib/geocoding/client"

export async function GET() {
  const client = new GeocodingClient()
  
  console.log('Testing GeocodingClient...')
  
  const testVenues = [
    { venueName: 'Golden Gate Park Bandshell' },
    { venueName: 'SF MOMA', address: '151 3rd St' },
    { venueName: 'Oracle Park' }
  ]
  
  const results = []
  
  for (const venue of testVenues) {
    console.log(`\nGeocoding: ${venue.venueName}${venue.address ? ` (${venue.address})` : ''}`)
    
    try {
      const result = await client.geocodeVenue(venue)
      
      if (result) {
        console.log(`✅ Success: ${result.formattedAddress}`)
        console.log(`   Coordinates: ${result.lat}, ${result.lng}`)
        
        results.push({
          venue: venue.venueName,
          success: true,
          coordinates: { lat: result.lat, lng: result.lng },
          formattedAddress: result.formattedAddress
        })
      } else {
        console.log('❌ Failed to geocode')
        results.push({
          venue: venue.venueName,
          success: false,
          error: 'No results found'
        })
      }
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.push({
        venue: venue.venueName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  return NextResponse.json({
    message: 'Geocoding test completed',
    results
  })
} 