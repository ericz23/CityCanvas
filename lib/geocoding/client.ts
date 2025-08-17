import type { GeocodingResult, GeocodingRequest, GoogleMapsGeocodingResponse } from './types'

export class GeocodingClient {
  private apiKey: string
  private baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json'

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || ''
    if (!this.apiKey) {
      console.warn('GOOGLE_MAPS_API_KEY not configured')
    }
  }

  async geocodeVenue(request: GeocodingRequest): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      console.warn('Cannot geocode: API key not configured')
      return null
    }

    try {
      // Construct the search query
      const searchQuery = this.buildSearchQuery(request)
      
      // Make the API request
      const response = await fetch(
        `${this.baseUrl}?address=${encodeURIComponent(searchQuery)}&key=${this.apiKey}&bounds=37.7,-122.55|37.85,-122.35&components=locality:san%20francisco|administrative_area:CA|country:US`
      )

      if (!response.ok) {
        console.error(`Geocoding API error: ${response.status} ${response.statusText}`)
        return null
      }

      const data: GoogleMapsGeocodingResponse = await response.json()

      if (data.status !== 'OK' || data.results.length === 0) {
        console.warn(`Geocoding failed for "${request.venueName}": ${data.status}`)
        return null
      }

      // Get the best result
      const bestResult = data.results[0]

      return {
        lat: bestResult.geometry.location.lat,
        lng: bestResult.geometry.location.lng,
        formattedAddress: bestResult.formatted_address
      }
    } catch (error) {
      console.error('Geocoding request failed:', error)
      return null
    }
  }

  private buildSearchQuery(request: GeocodingRequest): string {
    let query = request.venueName
    
    // Add address if provided
    if (request.address) {
      query += ` ${request.address}`
    }
    
    // Always append San Francisco context
    query += ' San Francisco CA'
    
    return query
  }



  // Validate that coordinates are within San Francisco bounds
  private isValidSFLocation(lat: number, lng: number): boolean {
    return lat >= 37.7 && lat <= 37.85 && lng >= -122.55 && lng <= -122.35
  }
} 