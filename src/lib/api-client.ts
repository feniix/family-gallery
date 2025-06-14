/**
 * Authenticated API client utilities
 * Ensures all API calls include proper credentials for authentication
 */

export interface ApiResponse<T = any> {
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
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * GET request with authentication
 */
export async function apiGet<T = any>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url);
    
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
export async function apiPost<T = any>(
  url: string, 
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    
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
export async function apiPut<T = any>(
  url: string, 
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    
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
export async function apiDelete<T = any>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url, {
      method: 'DELETE',
    });
    
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
    return { 
      ok: false, 
      status: 0, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
} 