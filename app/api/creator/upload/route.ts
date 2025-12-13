import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import { getCurrentSession } from "@/lib/server/auth"

export const dynamic = "force-dynamic"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session?.user || (session.user.role !== "CREATOR" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const type = formData.get("type") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
    const allowedAudioTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"]
    const allowedTypes = type === "image" ? allowedImageTypes : allowedAudioTypes

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    // Convert file to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")
    const dataUri = `data:${file.type};base64,${base64}`

    // Generate a safe filename
    const safeName = file.name
      .toLowerCase()
      .replace(/\.[^/.]+$/, "") 
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")

    // Upload to Cloudinary
    const folder = type === "image" ? "loop/scenes" : "loop/audio"
    const resourceType = type === "image" ? "image" : "video" 

    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder,
      public_id: `${safeName}-${Date.now()}`,
      resource_type: resourceType,
      ...(type === "image" && {
        transformation: [
          { quality: "auto", fetch_format: "auto" }
        ]
      }),
    })

    return NextResponse.json({ 
      success: true, 
      path: uploadResult.secure_url,
      filename: safeName,
      publicId: uploadResult.public_id,
    })
  } catch (error) {
    console.error("[upload] Error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Upload failed" 
    }, { status: 500 })
  }
}