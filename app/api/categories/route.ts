import { NextResponse } from "next/server"
import { CATEGORIES, TAGS } from "@/data/categories"

export async function GET() {
  return NextResponse.json({ categories: CATEGORIES, tags: TAGS })
}
