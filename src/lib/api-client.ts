/**
 * Authenticated API client utilities
 * Ensures all API calls include proper credentials for authentication
 * Updated: 2025-06-14 - Force cache bust
 */

import { apiLogger } from '@/lib/logger'

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Authenticated fetch wrapper that automatically includes credentials
 * Essential for Clerk cookie-based authentication
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  apiLogger.debug('Authenticated fetch called', { 
    url, 
    method: options.method || 'GET'
  });
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Critical for Clerk auth
    headers: {
      // Only set Content-Type if not FormData (FormData needs browser to set boundary)
      ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  
  apiLogger.debug('Authenticated fetch response', { 
    url,
    status: response.status, 
    statusText: response.statusText
  });
  
  // Log auth issues for debugging
  if (response.status === 307 || response.status === 302) {
    apiLogger.warn('Authentication redirect detected', {
      url,
      status: response.status,
      location: response.headers.get('location'),
      clerkAuthStatus: response.headers.get('x-clerk-auth-status'),
      clerkAuthReason: response.headers.get('x-clerk-auth-reason')
    });
  }
  
  return response;
}

/**
 * GET request with authentication
 */
export async function apiGet<T = unknown>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url);
    
    // Handle authentication redirects
    if (response.status === 307 || response.status === 302) {
      apiLogger.error('Authentication failed - redirect detected', { 
        url,
        method: 'GET',
        status: response.status,
        message: 'User not logged in or session expired'
      });
      return { 
        ok: false, 
        status: 401, 
        error: 'Authentication required - please sign in' 
      };
    }
    
    if (response.ok) {
      const data = await response.json();
      return { ok: true, status: response.status, data };
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { 
        ok: false, 
        status: response.status, 
        error: errorData.error || `HTTP ${response.status}` 
      };
    }
  } catch (error) {
    apiLogger.error('API GET request failed', { 
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    return { 
      ok: false, 
      status: 0, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

/**
 * POST request with authentication
 */
export async function apiPost<T = unknown>(
  url: string, 
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    
    // Handle authentication redirects
    if (response.status === 307 || response.status === 302) {
      apiLogger.error('Authentication failed - redirect detected', { 
        url,
        method: 'POST',
        status: response.status,
        message: 'User not logged in or session expired'
      });
      return { 
        ok: false, 
        status: 401, 
        error: 'Authentication required - please sign in' 
      };
    }
    
    if (response.ok) {
      const data = await response.json();
      return { ok: true, status: response.status, data };
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { 
        ok: false, 
        status: response.status, 
        error: errorData.error || `HTTP ${response.status}` 
      };
    }
  } catch (error) {
    apiLogger.error('API POST request failed', { 
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    return { 
      ok: false, 
      status: 0, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

/**
 * PUT request with authentication
 */
export async function apiPut<T = unknown>(
  url: string, 
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    
    // Handle authentication redirects
    if (response.status === 307 || response.status === 302) {
      apiLogger.error('Authentication failed - redirect detected', { 
        url,
        method: 'PUT',
        status: response.status,
        message: 'User not logged in or session expired'
      });
      return { 
        ok: false, 
        status: 401, 
        error: 'Authentication required - please sign in' 
      };
    }
    
    if (response.ok) {
      const data = await response.json();
      return { ok: true, status: response.status, data };
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { 
        ok: false, 
        status: response.status, 
        error: errorData.error || `HTTP ${response.status}` 
      };
    }
  } catch (error) {
    apiLogger.error('API PUT request failed', { 
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    return { 
      ok: false, 
      status: 0, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

/**
 * DELETE request with authentication
 */
export async function apiDelete<T = unknown>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url, {
      method: 'DELETE',
    });
    
    // Handle authentication redirects
    if (response.status === 307 || response.status === 302) {
      apiLogger.error('Authentication failed - redirect detected', { 
        url,
        method: 'DELETE',
        status: response.status,
        message: 'User not logged in or session expired'
      });
      return { 
        ok: false, 
        status: 401, 
        error: 'Authentication required - please sign in' 
      };
    }
    
    if (response.ok) {
      const data = await response.json();
      return { ok: true, status: response.status, data };
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { 
        ok: false, 
        status: response.status, 
        error: errorData.error || `HTTP ${response.status}` 
      };
    }
  } catch (error) {
    apiLogger.error('API DELETE request failed', { 
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    return { 
      ok: false, 
      status: 0, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
} 