import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  // Demo stub: return a fake job id
  return NextResponse.json({
    jobId: "job_demo_001",
    city: body?.city ?? "san-francisco",
    dryRun: body?.dryRun ?? true,
    summary: "Ingestion triggered (demo stub).",
  })
}
