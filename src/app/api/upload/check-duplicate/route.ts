import { NextRequest, NextResponse } from 'next/server'
import { processMediaMetadata } from '@/lib/metadata'
import { checkForDuplicate } from '@/lib/duplicate-detection'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const exifDataString = formData.get('exifData') as string | null
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(`[DUPLICATE CHECK] Starting duplicate check for: ${file.name}`)

    // Parse EXIF data if provided
    let exifData = null
    if (exifDataString) {
      try {
        exifData = JSON.parse(exifDataString)
        
        // Convert date strings back to Date objects after JSON parsing
        if (exifData.dateTimeOriginal && typeof exifData.dateTimeOriginal === 'string') {
          exifData.dateTimeOriginal = new Date(exifData.dateTimeOriginal)
        }
        if (exifData.dateTime && typeof exifData.dateTime === 'string') {
          exifData.dateTime = new Date(exifData.dateTime)
        }
        if (exifData.dateTimeDigitized && typeof exifData.dateTimeDigitized === 'string') {
          exifData.dateTimeDigitized = new Date(exifData.dateTimeDigitized)
        }
        
        console.log(`[DUPLICATE CHECK] EXIF data provided:`, {
          hasDateTimeOriginal: !!exifData?.dateTimeOriginal,
          hasDateTime: !!exifData?.dateTime,
          hasDateTimeDigitized: !!exifData?.dateTimeDigitized
        })
      } catch (error) {
        console.warn('Failed to parse EXIF data:', error)
        // Continue without EXIF data
      }
    } else {
      console.log(`[DUPLICATE CHECK] No EXIF data provided for ${file.name}`)
    }

    // Process metadata with pre-extracted EXIF data
    const { metadata, hash } = await processMediaMetadata(file, 'upload-check', 'web', exifData)
    
    console.log(`[DUPLICATE CHECK] Generated hash: ${hash.substring(0, 16)}...`)
    console.log(`[DUPLICATE CHECK] Metadata takenAt: ${metadata.takenAt}`)
    console.log(`[DUPLICATE CHECK] Date source: ${metadata.dateInfo.source}`)
    
    // Use the photo's actual date for duplicate checking, not upload date
    const photoDate = new Date(metadata.takenAt)
    console.log(`[DUPLICATE CHECK] Using photo date: ${photoDate.toISOString()} (${photoDate.getFullYear()})`)
    
    // Check for duplicates using the photo's date
    const duplicateResult = await checkForDuplicate(hash, photoDate)
    
    console.log(`[DUPLICATE CHECK] Duplicate result:`, {
      isDuplicate: duplicateResult.isDuplicate,
      existingMediaId: duplicateResult.existingMedia?.id,
      existingFilename: duplicateResult.existingMedia?.originalFilename
    })
    
    return NextResponse.json({
      hash,
      isDuplicate: duplicateResult.isDuplicate,
      existingMedia: duplicateResult.existingMedia
    })
    
  } catch (error) {
    console.error('[DUPLICATE CHECK] Error checking for duplicate:', error)
    return NextResponse.json(
      { error: 'Failed to check for duplicate' },
      { status: 500 }
    )
  }
} 