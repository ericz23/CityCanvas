export interface DeduplicationResult {
  isDuplicate: boolean
  confidence: number
  existingEventId?: string
  reason?: string
}

export interface DuplicateCheckOptions {
  fuzzyThreshold?: number // Default 0.8 (80% similarity)
  dateToleranceHours?: number // Default 24 hours
} 