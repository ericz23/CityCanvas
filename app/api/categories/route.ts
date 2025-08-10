import { NextResponse } from "next/server"
import { CATEGORIES, TAGS } from "@/data/categories"
import { prisma } from "@/lib/db"
import type { CategoriesApiResponse } from "@/lib/types"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const includeUsed = url.searchParams.get("includeUsed") === "true"

    let response: CategoriesApiResponse = {
      categories: CATEGORIES,
      tags: TAGS,
    }

    // Optionally include what categories/tags are actually being used in the database
    if (includeUsed) {
      try {
        // Get all unique categories and tags from active events
        const events = await prisma.event.findMany({
          where: {
            status: "ACTIVE",
          },
          select: {
            categories: true,
            tags: true,
          },
        })

        const usedCategories = new Set<string>()
        const usedTags = new Set<string>()

        events.forEach(event => {
          event.categories.forEach(cat => usedCategories.add(cat))
          event.tags.forEach(tag => usedTags.add(tag))
        })

        response = {
          ...response,
          usedCategories: Array.from(usedCategories),
          usedTags: Array.from(usedTags),
        }
      } catch (dbError) {
        console.warn('Could not fetch used categories/tags:', dbError)
        // Continue with just the static data
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in categories API:', error)
    // Fallback to static data if anything goes wrong
    return NextResponse.json({ 
      categories: CATEGORIES, 
      tags: TAGS 
    })
  }
}
