import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format file size for display (consolidated from multiple locations)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Extract file extension from filename (consolidated from multiple locations)
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1) {
    return ''
  }
  
  return filename.substring(lastDotIndex + 1).toLowerCase()
}

/**
 * Generate unique ID for files/media (consolidated from multiple locations)
 */
export function generateUniqueId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 8)
  
  return `${timestamp}_${randomStr}`
}

/**
 * Check if an email address should be an admin
 */
export function isAdminEmail(email: string): boolean {
  // Check both server-side and client-side environment variables
  const serverAdminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
  const publicAdminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
  
  // Combine both arrays and remove duplicates
  const allAdminEmails = [...new Set([...serverAdminEmails, ...publicAdminEmails])]
  
  return allAdminEmails.includes(email.trim())
}

/**
 * Validate file types
 */
export function isValidFileType(filename: string, type: 'image' | 'video' | 'any' = 'any'): boolean {
  const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.dng']
  const videoTypes = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
  
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  
  switch (type) {
    case 'image':
      return imageTypes.includes(extension)
    case 'video':
      return videoTypes.includes(extension)
    case 'any':
      return [...imageTypes, ...videoTypes].includes(extension)
    default:
      return false
  }
}
