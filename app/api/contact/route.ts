import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const { name, email, message, anonymous } = await req.json()

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_key: process.env.WEB3FORMS_KEY, 
      subject: "Loop Contact Form Submission",
      from_name: name || "Anonymous",
      email: email || "anonymous@loop.app",
      message: message,
    }),
  })

  const data = await response.json()
  
  if (data.success) {
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ success: false, error: "Failed to send" }, { status: 500 })
}