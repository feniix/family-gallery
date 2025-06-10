import { NextRequest, NextResponse } from 'next/server'
import { processMediaMetadata } from '@/lib/metadata'
import { checkForDuplicate } from '@/lib/duplicate-detection'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Process metadata to get file hash
    const { hash } = await processMediaMetadata(file, 'upload-check')
    
    // Check for duplicates
    const duplicateResult = await checkForDuplicate(hash, new Date())
    
    return NextResponse.json({
      hash,
      isDuplicate: duplicateResult.isDuplicate,
      existingMedia: duplicateResult.existingMedia
    })
    
  } catch (error) {
    console.error('Error checking for duplicate:', error)
    return NextResponse.json(
      { error: 'Failed to check for duplicate' },
      { status: 500 }
    )
  }
} 