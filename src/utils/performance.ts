// Performance monitoring and optimization utilities

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  type: 'timing' | 'counter' | 'gauge'
  tags?: Record<string, string>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: PerformanceObserver[] = []
  private maxMetrics = 1000

  constructor() {
    this.initializeObservers()
  }

  private initializeObservers() {
    // Observe navigation timing
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.navigationStart, 'timing')
              this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.navigationStart, 'timing')
              this.recordMetric('first_paint', navEntry.responseStart - navEntry.navigationStart, 'timing')
            }
          }
        })
        navObserver.observe({ entryTypes: ['navigation'] })
        this.observers.push(navObserver)
      } catch (error) {
        console.warn('Navigation timing observer not supported:', error)
      }

      // Observe resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming
              this.recordMetric('resource_load_time', resourceEntry.responseEnd - resourceEntry.startTime, 'timing', {
                resource_type: resourceEntry.initiatorType,
                resource_name: resourceEntry.name.split('/').pop() || 'unknown'
              })
            }
          }
        })
        resourceObserver.observe({ entryTypes: ['resource'] })
        this.observers.push(resourceObserver)
      } catch (error) {
        console.warn('Resource timing observer not supported:', error)
      }

      // Observe largest contentful paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              this.recordMetric('largest_contentful_paint', entry.startTime, 'timing')
            }
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)
      } catch (error) {
        console.warn('LCP observer not supported:', error)
      }

      // Observe first input delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'first-input') {
              const fidEntry = entry as PerformanceEventTiming
              this.recordMetric('first_input_delay', fidEntry.processingStart - fidEntry.startTime, 'timing')
            }
          }
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.push(fidObserver)
      } catch (error) {
        console.warn('FID observer not supported:', error)
      }
    }
  }

  recordMetric(name: string, value: number, type: PerformanceMetric['type'], tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      type,
      tags
    }

    this.metrics.unshift(metric)
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(0, this.maxMetrics)
    }

    // Log significant performance issues
    if (type === 'timing') {
      if (name === 'page_load_time' && value > 3000) {
        console.warn(`Slow page load detected: ${value}ms`)
      }
      if (name === 'largest_contentful_paint' && value > 2500) {
        console.warn(`Poor LCP detected: ${value}ms`)
      }
      if (name === 'first_input_delay' && value > 100) {
        console.warn(`Poor FID detected: ${value}ms`)
      }
    }
  }

  getMetrics(name?: string, limit = 100): PerformanceMetric[] {
    let filteredMetrics = this.metrics
    if (name) {
      filteredMetrics = this.metrics.filter(metric => metric.name === name)
    }
    return filteredMetrics.slice(0, limit)
  }

  getAverageMetric(name: string, timeWindow = 300000): number | null {
    const now = Date.now()
    const recentMetrics = this.metrics.filter(
      metric => metric.name === name && (now - metric.timestamp) <= timeWindow
    )

    if (recentMetrics.length === 0) return null

    const sum = recentMetrics.reduce((acc, metric) => acc + metric.value, 0)
    return sum / recentMetrics.length
  }

  clearMetrics() {
    this.metrics = []
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Bundle size analyzer
export function analyzeBundleSize() {
  if (typeof window === 'undefined') return null

  const scripts = Array.from(document.querySelectorAll('script[src]'))
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
  
  const analysis = {
    scripts: scripts.map(script => ({
      src: (script as HTMLScriptElement).src,
      async: (script as HTMLScriptElement).async,
      defer: (script as HTMLScriptElement).defer
    })),
    styles: styles.map(style => ({
      href: (style as HTMLLinkElement).href
    })),
    totalScripts: scripts.length,
    totalStyles: styles.length
  }

  return analysis
}

// Memory usage monitoring
export function getMemoryUsage() {
  if (typeof window === 'undefined' || !('performance' in window) || !('memory' in performance)) {
    return null
  }

  const memory = (performance as any).memory
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
  }
}

// Component performance wrapper
export function measureComponentPerformance<T extends (...args: any[]) => any>(
  componentName: string,
  fn: T
): T {
  return ((...args: any[]) => {
    const start = performance.now()
    const result = fn(...args)
    const end = performance.now()
    
    performanceMonitor.recordMetric(`component_${componentName}_render`, end - start, 'timing')
    
    return result
  }) as T
}

// API call performance wrapper
export function measureApiCall<T extends (...args: any[]) => Promise<any>>(
  apiName: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const start = performance.now()
    try {
      const result = await fn(...args)
      const end = performance.now()
      
      performanceMonitor.recordMetric(`api_${apiName}_success`, end - start, 'timing')
      performanceMonitor.recordMetric(`api_${apiName}_calls`, 1, 'counter')
      
      return result
    } catch (error) {
      const end = performance.now()
      
      performanceMonitor.recordMetric(`api_${apiName}_error`, end - start, 'timing')
      performanceMonitor.recordMetric(`api_${apiName}_errors`, 1, 'counter')
      
      throw error
    }
  }) as T
}

// Lazy loading utility
export function createLazyComponent(importFn: () => Promise<any>) {
  return () => {
    const start = performance.now()
    return importFn().then(module => {
      const end = performance.now()
      performanceMonitor.recordMetric('lazy_component_load', end - start, 'timing')
      return module
    })
  }
}

// Image optimization utility
export function optimizeImage(src: string, options: {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
} = {}): string {
  // In a real implementation, this would integrate with an image optimization service
  // For now, return the original src with query parameters for demonstration
  const params = new URLSearchParams()
  
  if (options.width) params.set('w', options.width.toString())
  if (options.height) params.set('h', options.height.toString())
  if (options.quality) params.set('q', options.quality.toString())
  if (options.format) params.set('f', options.format)
  
  const queryString = params.toString()
  return queryString ? `${src}?${queryString}` : src
}

// Debounce utility for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): T {
  let timeout: NodeJS.Timeout | null = null
  
  return ((...args: any[]) => {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }) as T
}

// Throttle utility for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean
  
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }) as T
}

// Performance report generator
export function generatePerformanceReport() {
  const metrics = performanceMonitor.getMetrics()
  const memoryUsage = getMemoryUsage()
  const bundleAnalysis = analyzeBundleSize()
  
  const report = {
    timestamp: new Date().toISOString(),
    metrics: {
      pageLoad: performanceMonitor.getAverageMetric('page_load_time'),
      domContentLoaded: performanceMonitor.getAverageMetric('dom_content_loaded'),
      largestContentfulPaint: performanceMonitor.getAverageMetric('largest_contentful_paint'),
      firstInputDelay: performanceMonitor.getAverageMetric('first_input_delay'),
      apiCalls: metrics.filter(m => m.name.includes('api_') && m.type === 'timing'),
      componentRenders: metrics.filter(m => m.name.includes('component_') && m.type === 'timing')
    },
    memory: memoryUsage,
    bundle: bundleAnalysis,
    recommendations: generateRecommendations(metrics, memoryUsage)
  }
  
  return report
}

function generateRecommendations(metrics: PerformanceMetric[], memoryUsage: any): string[] {
  const recommendations: string[] = []
  
  const avgPageLoad = performanceMonitor.getAverageMetric('page_load_time')
  if (avgPageLoad && avgPageLoad > 3000) {
    recommendations.push('Consider optimizing bundle size and implementing code splitting')
  }
  
  const avgLCP = performanceMonitor.getAverageMetric('largest_contentful_paint')
  if (avgLCP && avgLCP > 2500) {
    recommendations.push('Optimize largest contentful paint by preloading critical resources')
  }
  
  const avgFID = performanceMonitor.getAverageMetric('first_input_delay')
  if (avgFID && avgFID > 100) {
    recommendations.push('Reduce JavaScript execution time to improve first input delay')
  }
  
  if (memoryUsage && memoryUsage.usagePercentage > 80) {
    recommendations.push('High memory usage detected - consider implementing memory optimization')
  }
  
  const slowApiCalls = metrics.filter(m => 
    m.name.includes('api_') && m.type === 'timing' && m.value > 1000
  )
  if (slowApiCalls.length > 0) {
    recommendations.push('Some API calls are slow - consider caching or optimization')
  }
  
  return recommendations
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Cleanup function for when the app unmounts
export function cleanupPerformanceMonitoring() {
  performanceMonitor.disconnect()
  performanceMonitor.clearMetrics()
}

// Vue plugin for performance monitoring
export const PerformancePlugin = {
  install(app: any) {
    app.config.globalProperties.$performance = performanceMonitor
    app.provide('performance', performanceMonitor)
  }
}