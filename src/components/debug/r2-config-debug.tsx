'use client';

import { r2Config } from '@/lib/config';

export function R2ConfigDebug() {
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded text-xs font-mono z-50">
      <div className="font-bold mb-1">R2 Config Debug</div>
      <div>useSignedUrls: {r2Config.useSignedUrls ? 'true' : 'false'}</div>
      <div>NEXT_PUBLIC_R2_USE_SIGNED_URLS: {process.env.NEXT_PUBLIC_R2_USE_SIGNED_URLS || 'undefined'}</div>
      <div>R2_USE_SIGNED_URLS: {process.env.R2_USE_SIGNED_URLS || 'undefined'}</div>
      <div>isClient: {typeof window !== 'undefined' ? 'true' : 'false'}</div>
    </div>
  );
} 