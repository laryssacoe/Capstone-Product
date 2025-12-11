import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { name, email, message, anonymous } = await req.json()

  const senderName = name || "Anonymous visitor"
  const replyEmail = typeof email === "string" && email.trim().length > 0 ? email.trim() : undefined
  const inbox = process.env.CONTACT_INBOX || "laryssa@uni.minerva.edu"

  try {
    const { data, error } = await resend.emails.send({
      from: `Loop Moderation <${process.env.ADMIN_APPROVAL_EMAIL}>`, 
      to: inbox,
      subject: "Loop Contact Form Submission",
      replyTo: replyEmail,
      text: `You received a new message from the Loop Contact Form.

Sender: ${senderName}
Email: ${replyEmail ?? "Anonymous (no reply address provided)"}
Anonymous Submission: ${anonymous ? "Yes" : "No"}
-----------------------------
Message:
${message}
`,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to send message." },
        { status: 500 }
      )
    }

    console.log("Email sent successfully:", data?.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const err = error as Error
    console.error("Email send failed:", err.message)
    return NextResponse.json(
      { success: false, error: "Failed to send message. Please try again later." },
      { status: 500 }
    )
  }
}