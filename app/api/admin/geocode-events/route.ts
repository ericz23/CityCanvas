import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { GeocodingClient } from "@/lib/geocoding/client"

const prisma = new PrismaClient()
const geocodingClient = new GeocodingClient()

export async function POST() {
  try {
    console.log('Starting geocoding of existing events...')
    
    // Find all events without coordinates
    const eventsWithoutCoords = await prisma.event.findMany({
      where: {
        lat: null,
        venueName: {
          not: null
        }
      },
      select: {
        id: true,
        title: true,
        venueName: true,
        address: true
      }
    })
    
    console.log(`Found ${eventsWithoutCoords.length} events without coordinates`)
    
    if (eventsWithoutCoords.length === 0) {
      return NextResponse.json({
        message: 'No events need geocoding!',
        total: 0,
        success: 0,
        failed: 0
      })
    }
    
    let successCount = 0
    let failureCount = 0
    const results = []
    
    for (const event of eventsWithoutCoords) {
      console.log(`\nGeocoding: ${event.title} at ${event.venueName}`)
      
      try {
        const geocodeResult = await geocodingClient.geocodeVenue({
          venueName: event.venueName!,
          address: event.address || undefined
        })
        
        if (geocodeResult) {
          // Update the event with coordinates
          await prisma.event.update({
            where: { id: event.id },
            data: {
              lat: geocodeResult.lat,
              lng: geocodeResult.lng,
              updatedAt: new Date()
            }
          })
          
          console.log(`✅ Success: ${geocodeResult.lat}, ${geocodeResult.lng}`)
          successCount++
          
          results.push({
            event: event.title,
            venue: event.venueName,
            success: true,
            coordinates: { lat: geocodeResult.lat, lng: geocodeResult.lng }
          })
        } else {
          console.log('❌ Failed to geocode')
          failureCount++
          
          results.push({
            event: event.title,
            venue: event.venueName,
            success: false,
            error: 'No geocoding result'
          })
        }
        
        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.error(`❌ Error geocoding "${event.title}":`, error)
        failureCount++
        
        results.push({
          event: event.title,
          venue: event.venueName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    console.log(`\n=== Geocoding Complete ===`)
    console.log(`Success: ${successCount}`)
    console.log(`Failed: ${failureCount}`)
    console.log(`Total: ${eventsWithoutCoords.length}`)
    
    return NextResponse.json({
      message: 'Geocoding complete',
      total: eventsWithoutCoords.length,
      success: successCount,
      failed: failureCount,
      results: results.slice(0, 10) // Return first 10 results for preview
    })
    
  } catch (error) {
    console.error('Geocoding backfill failed:', error)
    return NextResponse.json(
      { error: 'Geocoding backfill failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 