import { NextRequest } from 'next/server';

/**
 * Create a mock NextRequest for testing
 */
export function createMockNextRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | FormData;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body } = options;
  
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body && { body }),
  };
  
  return new NextRequest(url, init);
}

/**
 * Mock environment variables for testing
 */
export function mockEnvVars(vars: Record<string, string>) {
  const originalEnv = { ...process.env };
  
  Object.assign(process.env, vars);
  
  return () => {
    process.env = originalEnv;
  };
}

/**
 * Create a test file blob
 */
export function createTestFile(
  name: string = 'test.jpg',
  type: string = 'image/jpeg',
  content: string = 'test file content'
): File {
  return new File([content], name, { type });
} 