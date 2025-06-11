import { NextRequest, NextResponse } from 'next/server'
import { processMediaMetadata } from '@/lib/metadata'
import { checkForDuplicate } from '@/lib/duplicate-detection'
import { duplicateLogger } from '@/lib/logger'

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

    duplicateLogger.debug(`Starting duplicate check`, { filename: file.name, size: file.size })

    // Parse EXIF data if provided
    let exifData = null
    if (exifDataString) {
      duplicateLogger.debug(`EXIF data provided`, {
        filename: file.name,
        exifDataLength: exifDataString.length
      })
      
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
        
        duplicateLogger.debug(`EXIF data parsed successfully`, {
          hasDateTimeOriginal: !!exifData?.dateTimeOriginal,
          hasDateTime: !!exifData?.dateTime,
          hasDateTimeDigitized: !!exifData?.dateTimeDigitized
        })
      } catch (error) {
        duplicateLogger.warn('Failed to parse EXIF data', { filename: file.name, error: error instanceof Error ? error.message : 'Unknown error' })
        exifData = null
      }
    } else {
      duplicateLogger.debug(`No EXIF data provided`, { filename: file.name })
    }

    // Process metadata with pre-extracted EXIF data
    const { metadata, hash } = await processMediaMetadata(file, 'upload-check', 'web', exifData)
    
    duplicateLogger.debug(`Generated hash and processed metadata`, { 
      filename: file.name,
      hashPrefix: hash.substring(0, 16) + '...',
      takenAt: metadata.takenAt,
      dateSource: metadata.dateInfo.source
    })
    
    // Use the photo's actual date for duplicate checking, not upload date
    const photoDate = new Date(metadata.takenAt)
    duplicateLogger.debug(`Using photo date for duplicate check`, { 
      filename: file.name,
      photoDate: photoDate.toISOString(), 
      year: photoDate.getFullYear() 
    })
    
    // Check for duplicates using the photo's date
    const duplicateResult = await checkForDuplicate(hash, photoDate)
    
    duplicateLogger.debug(`Duplicate check result`, {
      filename: file.name,
      isDuplicate: duplicateResult.isDuplicate,
      existingFile: duplicateResult.existingMedia?.originalFilename
    })
    
    return NextResponse.json({
      hash,
      isDuplicate: duplicateResult.isDuplicate,
      existingMedia: duplicateResult.existingMedia
    })
    
  } catch (error) {
    duplicateLogger.error('Error checking for duplicate', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { error: 'Failed to check for duplicate' },
      { status: 500 }
    )
  }
} 