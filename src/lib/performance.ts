/**
 * Performance optimization utilities for the gallery
 * Includes memory management, virtual scrolling, and performance monitoring
 */

import { MediaMetadata } from '@/types/media';

/**
 * Virtual scrolling configuration
 */
export interface VirtualScrollConfig {
  containerHeight: number;
  itemHeight: number;
  overscan: number; // Number of items to render outside visible area
  bufferSize: number; // Maximum items to keep in memory
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private memoryThreshold = 50 * 1024 * 1024; // 50MB
  private performanceEntries: PerformanceEntry[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Monitor memory usage and trigger cleanup if needed
   */
  checkMemoryUsage(): { usage: number; needsCleanup: boolean } {
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      const usedJSHeapSize = memoryInfo.usedJSHeapSize;
      
      return {
        usage: usedJSHeapSize,
        needsCleanup: usedJSHeapSize > this.memoryThreshold
      };
    }
    
    return { usage: 0, needsCleanup: false };
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, startTime: number) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Performance: ${operation} took ${duration.toFixed(2)}ms`);
    
    this.performanceEntries.push({
      name: operation,
      entryType: 'measure',
      startTime,
      duration
    } as PerformanceEntry);

    // Keep only last 100 entries
    if (this.performanceEntries.length > 100) {
      this.performanceEntries = this.performanceEntries.slice(-100);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): { operation: string; averageTime: number; count: number }[] {
    const operationStats = new Map<string, { total: number; count: number }>();
    
    this.performanceEntries.forEach(entry => {
      const stats = operationStats.get(entry.name) || { total: 0, count: 0 };
      stats.total += entry.duration;
      stats.count += 1;
      operationStats.set(entry.name, stats);
    });

    return Array.from(operationStats.entries()).map(([operation, stats]) => ({
      operation,
      averageTime: stats.total / stats.count,
      count: stats.count
    }));
  }
}

/**
 * Virtual scrolling calculator
 */
export class VirtualScrollCalculator {
  private config: VirtualScrollConfig;

  constructor(config: VirtualScrollConfig) {
    this.config = config;
  }

  /**
   * Calculate which items should be visible based on scroll position
   */
  calculateVisibleRange(
    scrollTop: number,
    totalItems: number
  ): { start: number; end: number; paddingTop: number; paddingBottom: number } {
    const visibleStart = Math.floor(scrollTop / this.config.itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(this.config.containerHeight / this.config.itemHeight),
      totalItems
    );

    // Add overscan
    const start = Math.max(0, visibleStart - this.config.overscan);
    const end = Math.min(totalItems, visibleEnd + this.config.overscan);

    return {
      start,
      end,
      paddingTop: start * this.config.itemHeight,
      paddingBottom: (totalItems - end) * this.config.itemHeight
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VirtualScrollConfig>) {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Memory management for media items
 */
export class MediaMemoryManager {
  private static instance: MediaMemoryManager;
  private imageCache = new Map<string, HTMLImageElement>();
  private videoCache = new Map<string, HTMLVideoElement>();
  private maxCacheSize = 100; // Maximum cached items
  private recentlyUsed: string[] = [];

  static getInstance(): MediaMemoryManager {
    if (!MediaMemoryManager.instance) {
      MediaMemoryManager.instance = new MediaMemoryManager();
    }
    return MediaMemoryManager.instance;
  }

  /**
   * Pre-load images for better performance
   */
  preloadImages(mediaItems: MediaMetadata[], priorityIndexes: number[] = []) {
    const monitor = PerformanceMonitor.getInstance();
    const startTime = performance.now();

    // Prioritize specific indexes first
    const priorityItems = priorityIndexes.map(index => mediaItems[index]).filter(Boolean);
    const regularItems = mediaItems.filter((_, index) => !priorityIndexes.includes(index));
    
    const itemsToLoad = [...priorityItems, ...regularItems].slice(0, 20); // Limit to 20 items

    itemsToLoad.forEach((media, index) => {
      if (media.type === 'photo' && !this.imageCache.has(media.id)) {
        const img = new Image();
        img.loading = index < 8 ? 'eager' : 'lazy';
        img.src = `/api/media/download/${media.id}/thumbnail`;
        
        img.onload = () => {
          this.addToCache(media.id, img);
        };
        
        img.onerror = () => {
          console.warn(`Failed to preload image: ${media.id}`);
        };
      }
    });

    monitor.logPerformance('preloadImages', startTime);
  }

  /**
   * Add item to cache with LRU eviction
   */
  private addToCache(id: string, element: HTMLImageElement | HTMLVideoElement) {
    if (element instanceof HTMLImageElement) {
      this.imageCache.set(id, element);
    } else {
      this.videoCache.set(id, element);
    }

    // Update recently used
    this.recentlyUsed = this.recentlyUsed.filter(cachedId => cachedId !== id);
    this.recentlyUsed.unshift(id);

    // Evict oldest items if cache is full
    if (this.recentlyUsed.length > this.maxCacheSize) {
      const evictId = this.recentlyUsed.pop()!;
      this.imageCache.delete(evictId);
      this.videoCache.delete(evictId);
    }
  }

  /**
   * Clear cache to free memory
   */
  clearCache() {
    this.imageCache.clear();
    this.videoCache.clear();
    this.recentlyUsed = [];
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      imageCount: this.imageCache.size,
      videoCount: this.videoCache.size,
      totalCached: this.recentlyUsed.length,
      maxSize: this.maxCacheSize
    };
  }
}

/**
 * Optimized scroll handler with throttling
 */
export function createOptimizedScrollHandler(
  callback: (scrollTop: number) => void,
  throttleMs = 16 // ~60fps
) {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (event: Event) => {
    const now = performance.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= throttleMs) {
      lastCall = now;
      const target = event.target as HTMLElement;
      callback(target.scrollTop);
    } else {
      // Schedule for later if called too frequently
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const target = event.target as HTMLElement;
        callback(target.scrollTop);
        lastCall = performance.now();
      }, throttleMs - timeSinceLastCall);
    }
  };
}

/**
 * Intersection Observer optimization
 */
export function createOptimizedIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    rootMargin: '100px',
    threshold: [0, 0.25, 0.5, 0.75, 1],
    ...options
  };

  return new IntersectionObserver((entries) => {
    // Batch process entries for better performance
    requestAnimationFrame(() => {
      callback(entries, arguments[1]);
    });
  }, defaultOptions);
}

/**
 * Debounced resize handler
 */
export function createResizeHandler(
  callback: (width: number, height: number) => void,
  debounceMs = 250
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      callback(window.innerWidth, window.innerHeight);
    }, debounceMs);
  };
}

/**
 * Check if device is low-performance
 */
export function isLowPerformanceDevice(): boolean {
  // Check various indicators of device performance
  const connection = (navigator as any).connection;
  const hardwareConcurrency = navigator.hardwareConcurrency || 1;
  const deviceMemory = (navigator as any).deviceMemory || 1;

  // Consider device low-performance if:
  // - Less than 4 CPU cores
  // - Less than 2GB RAM
  // - Slow network connection
  return (
    hardwareConcurrency < 4 ||
    deviceMemory < 2 ||
    (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'))
  );
}

/**
 * Get optimized loading strategy based on device capabilities
 */
export function getLoadingStrategy() {
  const isLowPerf = isLowPerformanceDevice();
  
  return {
    initialBatchSize: isLowPerf ? 12 : 20,
    batchSize: isLowPerf ? 8 : 16,
    preloadDistance: isLowPerf ? 100 : 200,
    enableVirtualScrolling: isLowPerf,
    reduceAnimations: isLowPerf,
    compressImages: isLowPerf
  };
} 