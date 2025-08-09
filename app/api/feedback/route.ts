import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  // In production, persist to a moderation table. Here we just acknowledge.
  return NextResponse.json({ ok: true, received: body ?? {} })
}
