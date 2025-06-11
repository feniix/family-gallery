import { NextResponse } from 'next/server'
import { readJsonFile } from '@/lib/json-db'
import { dbLogger } from '@/lib/logger'

export async function GET() {
  try {
    const results: Record<string, unknown> = {}
    
    // Check common years for database files including historical years
    const yearsToCheck = [2005, 2006, 2007, 2008, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
    
    for (const year of yearsToCheck) {
      try {
        const yearData = await readJsonFile(`media/${year}.json`)
        if (yearData && yearData.media) {
          results[year] = {
            exists: true,
            mediaCount: yearData.media.length,
            files: yearData.media.map((m: Record<string, unknown>) => ({
              filename: m.originalFilename as string,
              hash: ((m.metadata as Record<string, unknown>)?.hash as string)?.substring(0, 16) + '...',
              takenAt: m.takenAt as string,
              id: m.id as string
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
    dbLogger.error('Error checking databases', { error })
    return NextResponse.json(
      { error: 'Failed to check databases' },
      { status: 500 }
    )
  }
} 