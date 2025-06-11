import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from './logger';

const accessLogger = apiLogger;

interface AccessLogEntry {
  method: string;
  url: string;
  path: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  referer?: string;
  ip?: string;
  contentLength?: number;
  [key: string]: unknown;
}

/**
 * Log HTTP access in structured JSON format
 */
export function logAccess(
  request: NextRequest,
  response: NextResponse,
  startTime: number
) {
  // Skip access logging if disabled
  if (process.env.LOG_ACCESS === 'false') {
    return;
  }
  
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  const logEntry: AccessLogEntry = {
    method: request.method,
    url: request.url,
    path: new URL(request.url).pathname,
    statusCode: response.status,
    responseTime,
  };

  // Add optional headers if present
  const userAgent = request.headers.get('user-agent');
  if (userAgent) {
    logEntry.userAgent = userAgent;
  }

  const referer = request.headers.get('referer');
  if (referer) {
    logEntry.referer = referer;
  }

  // Get IP from various possible headers
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') ||
            request.headers.get('cf-connecting-ip') ||
            'unknown';
  if (ip !== 'unknown') {
    logEntry.ip = ip;
  }

  // Add content length if available
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    logEntry.contentLength = parseInt(contentLength, 10);
  }

  // Log with appropriate level based on status code
  if (response.status >= 500) {
    accessLogger.error('HTTP request failed', logEntry);
  } else if (response.status >= 400) {
    accessLogger.warn('HTTP client error', logEntry);
  } else {
    accessLogger.info('HTTP request', logEntry);
  }
}

/**
 * Create a timer for measuring request duration
 */
export function createAccessTimer(): number {
  return Date.now();
} 