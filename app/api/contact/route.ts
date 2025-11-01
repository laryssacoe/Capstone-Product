import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(req: NextRequest) {
  const { name, email, message, anonymous } = await req.json()

  const fallbackFrom = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || "no-reply@loop.local"
  const inbox = process.env.CONTACT_INBOX || "laryssa@uni.minerva.edu"
  const senderName = name || "Anonymous visitor"
  const replyEmail = typeof email === "string" && email.trim().length > 0 ? email.trim() : undefined

  // Configure transporter (use environment variables in production)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const mailOptions = {
    from: fallbackFrom,
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
    await transporter.sendMail(mailOptions)
    return NextResponse.json({ success: true })
  } catch (error) {
    const err = error as Error
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
