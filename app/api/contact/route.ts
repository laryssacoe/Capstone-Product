import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json()

    const accessKey = process.env.WEB3FORMS_KEY
    if (!accessKey) {
      return NextResponse.json(
        { success: false, error: "Contact form is not configured." },
        { status: 500 },
      )
    }

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "LoopContact/1.0 (+https://loop-capstone.up.railway.app)",
      },
      body: JSON.stringify({
        access_key: accessKey,
        subject: "Loop Contact Form Submission",
        from_name: name || "Anonymous",
        email: email || "anonymous@loop.app",
        message,
      }),
    })

    const contentType = response.headers.get("content-type") || ""
    if (response.ok && contentType.includes("application/json")) {
      const payload = await response.json()
      if (payload?.success) {
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json(
      { success: false, error: "Contact service is unavailable right now. Please try again soon." },
      { status: 502 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}