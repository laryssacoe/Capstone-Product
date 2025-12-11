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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject: "Loop Contact Form Submission",
        from_name: name || "Anonymous",
        email: email || "anonymous@loop.app",
        message,
      }),
    })

    const contentType = response.headers.get("content-type") || ""
    let payload: any = null
    if (contentType.includes("application/json")) {
      payload = await response.json()
    } else {
      payload = { success: false, error: await response.text() }
    }

    if (response.ok && payload?.success) {
      return NextResponse.json({ success: true })
    }

    const errorMessage =
      payload?.error ||
      payload?.message ||
      response.statusText ||
      "Failed to send"

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}