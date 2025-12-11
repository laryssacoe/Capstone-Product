import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const { name, email, message, anonymous } = await req.json()

  const fallbackFrom = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || "no-reply@loop.local"
  const inbox = process.env.CONTACT_INBOX || process.env.SMTP_USER || "laryssa@uni.minerva.edu"
  const senderName = name || "Anonymous visitor"
  const replyEmail = typeof email === "string" && email.trim().length > 0 ? email.trim() : undefined

  console.log("SMTP Config:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER ? "set" : "missing",
    pass: process.env.SMTP_PASS ? "set" : "missing",
  })

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    tls: {
      rejectUnauthorized: false,
    },
  } as any)

  const mailOptions = {
    from: `"${process.env.MAIL_FROM_NAME || "Loop"}" <${fallbackFrom}>`,
    to: inbox,
    subject: `Loop Contact Form Submission`,
    text:
      `You received a new message from the Loop Contact Form.\n\n` +
      `Sender: ${senderName}\n` +
      `Email: ${replyEmail ?? "Anonymous (no reply address provided)"}\n` +
      `Anonymous Submission: ${anonymous ? "Yes" : "No"}\n` +
      `-----------------------------\n` +
      `Message:\n${message}\n` +
      `-----------------------------\n` +
      `${replyEmail ? "The sender included a reply-to address." : "This sender did not supply contact information; you cannot reply directly."}\n` +
      `This message was sent via https://loop.com (placeholder for deployment).`,
    ...(replyEmail ? { replyTo: replyEmail } : {}),
  }

  try {
    console.log("Attempting to send email...")
    const result: any = await transporter.sendMail(mailOptions)
    console.log("Email sent successfully:", result.messageId)
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