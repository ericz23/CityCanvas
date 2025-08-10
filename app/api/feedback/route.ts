import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }

    // For now, we'll log the feedback since there's no feedback table in the schema
    // In a production system, you'd want to add a Feedback model to the Prisma schema
    console.log('Feedback received:', {
      timestamp: new Date().toISOString(),
      ...body
    })

    // TODO: When a feedback table is added to the schema, uncomment this:
    // const feedback = await prisma.feedback.create({
    //   data: {
    //     content: body.content || '',
    //     email: body.email || null,
    //     eventId: body.eventId || null,
    //     rating: body.rating || null,
    //     metadata: body.metadata || {},
    //   }
    // })

    return NextResponse.json({ 
      ok: true, 
      received: body,
      message: "Feedback received and logged"
    })
  } catch (error) {
    console.error('Error handling feedback:', error)
    return NextResponse.json(
      { error: "Failed to process feedback" },
      { status: 500 }
    )
  }
}
