import { PrismaClient } from '@prisma/client'
import type { DeduplicationResult, DuplicateCheckOptions } from './types'
import type { ExtractedEvent } from '../llm/client'

const prisma = new PrismaClient()

export class DeduplicationClient {
  private fuzzyThreshold: number
  private dateToleranceHours: number

  constructor(options: DuplicateCheckOptions = {}) {
    this.fuzzyThreshold = options.fuzzyThreshold || 0.8
    this.dateToleranceHours = options.dateToleranceHours || 24
  }

  async checkDuplicate(event: ExtractedEvent): Promise<DeduplicationResult> {
    if (!event.title || !event.startsAt) {
      return {
        isDuplicate: false,
        confidence: 0,
        reason: 'Missing title or start date'
      }
    }

    const startDate = new Date(event.startsAt)
    const dateRange = {
      gte: new Date(startDate.getTime() - this.dateToleranceHours * 60 * 60 * 1000),
      lte: new Date(startDate.getTime() + this.dateToleranceHours * 60 * 60 * 1000)
    }

    // Find events within the date range
    const existingEvents = await prisma.event.findMany({
      where: {
        startsAt: dateRange,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        title: true,
        startsAt: true
      }
    })

    if (existingEvents.length === 0) {
      return {
        isDuplicate: false,
        confidence: 0,
        reason: 'No events found in date range'
      }
    }

    // Check for fuzzy title matches
    let bestMatch: DeduplicationResult = {
      isDuplicate: false,
      confidence: 0
    }

    for (const existingEvent of existingEvents) {
      const similarity = this.calculateSimilarity(event.title, existingEvent.title)
      
      if (similarity >= this.fuzzyThreshold && similarity > bestMatch.confidence) {
        bestMatch = {
          isDuplicate: true,
          confidence: similarity,
          existingEventId: existingEvent.id,
          reason: `Fuzzy title match (${Math.round(similarity * 100)}% similar)`
        }
      }
    }

    return bestMatch
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation using Levenshtein distance
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
    const maxLength = Math.max(str1.length, str2.length)
    
    if (maxLength === 0) return 1.0
    
    return 1 - (distance / maxLength)
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }

    return matrix[str2.length][str1.length]
  }
} 