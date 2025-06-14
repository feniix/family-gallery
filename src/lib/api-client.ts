/**
 * Authenticated API client utilities
 * Ensures all API calls include proper credentials for authentication
 * Updated: 2025-06-14 - Force cache bust
 */

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Authenticated fetch wrapper that automatically includes credentials
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  console.log('🔐 authenticatedFetch called:', url, { credentials: 'include' });
  console.log('🔐 Request headers:', options.headers);
  console.log('🔐 Document cookies:', document.cookie ? 'Present' : 'None');
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  console.log('🔐 Response status:', response.status, response.statusText);
  console.log('🔐 Response headers:', Object.fromEntries(response.headers.entries()));
  
  // If we get a redirect, log more details
  if (response.status === 307 || response.status === 302) {
    console.log('🔐 REDIRECT detected - this indicates authentication failure');
    console.log('🔐 Redirect location:', response.headers.get('location'));
    console.log('🔐 Clerk auth status:', response.headers.get('x-clerk-auth-status'));
    console.log('🔐 Clerk auth reason:', response.headers.get('x-clerk-auth-reason'));
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
      console.error('🔐 Authentication failed - user not logged in or session expired');
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
    console.error('🔐 API request failed:', error);
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
      console.error('🔐 Authentication failed - user not logged in or session expired');
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
    console.error('🔐 API request failed:', error);
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
      console.error('🔐 Authentication failed - user not logged in or session expired');
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
    console.error('🔐 API request failed:', error);
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
      console.error('🔐 Authentication failed - user not logged in or session expired');
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
    console.error('🔐 API request failed:', error);
    return { 
      ok: false, 
      status: 0, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
} 