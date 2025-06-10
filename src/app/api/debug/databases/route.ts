import { NextRequest, NextResponse } from 'next/server'
import { readJsonFile } from '@/lib/json-db'

export async function GET(request: NextRequest) {
  try {
    const results: any = {}
    
    // Check common years for database files
    const yearsToCheck = [2006, 2007, 2008, 2024, 2025]
    
    for (const year of yearsToCheck) {
      try {
        const yearData = await readJsonFile(`media/${year}.json`)
        if (yearData && yearData.media) {
          results[year] = {
            exists: true,
            mediaCount: yearData.media.length,
            files: yearData.media.map((m: any) => ({
              filename: m.originalFilename,
              hash: m.metadata?.hash?.substring(0, 16) + '...',
              takenAt: m.takenAt,
              id: m.id
            }))
          }
        } else {
          results[year] = { exists: false }
        }
      } catch (error) {
        results[year] = { 
          exists: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    }
    
    return NextResponse.json(results)
    
  } catch (error) {
    console.error('Error checking databases:', error)
    return NextResponse.json(
      { error: 'Failed to check databases' },
      { status: 500 }
    )
  }
} 