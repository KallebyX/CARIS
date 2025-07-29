import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!type || !['audio', 'image'].includes(type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', type)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || (type === 'audio' ? 'wav' : 'jpg')
    const filename = `${userId}_${timestamp}.${extension}`
    const filepath = join(uploadDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return public URL
    const publicUrl = `/uploads/${type}/${filename}`
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      filename: filename
    })
    
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: "Failed to upload file" }, 
      { status: 500 }
    )
  }
}