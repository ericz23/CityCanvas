export interface GeocodingResult {
  lat: number
  lng: number
  formattedAddress: string
}

export interface GeocodingRequest {
  venueName: string
  address?: string
}

export interface GoogleMapsGeocodingResponse {
  results: Array<{
    formatted_address: string
    geometry: {
      location: {
        lat: number
        lng: number
      }
    }
    place_id: string
    types: string[]
  }>
  status: string
} 