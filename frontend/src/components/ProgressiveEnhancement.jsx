import React, { useState, useEffect, useRef } from 'react'

export function ProgressiveLoader({ 
  children, 
  fallback, 
  delay = 200, 
  timeout = 10000,
  retryEnabled = true,
  onError = null 
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const mountedRef = useRef(true)
  const timeoutRef = useRef()
  const delayRef = useRef()

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (delayRef.current) clearTimeout(delayRef.current)
    }
  }, [])

  useEffect(() => {
    // Reset states on retry
    if (retryCount > 0) {
      setIsLoading(true)
      setHasError(false)
    }

    // Add minimum loading delay to prevent flashing
    delayRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      
      // Simulate loading completion (in real app, this would be based on data loading)
      setIsLoading(false)
    }, delay)

    // Add timeout for loading
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      
      setHasError(true)
      setIsLoading(false)
      onError?.('Loading timeout')
    }, timeout)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (delayRef.current) clearTimeout(delayRef.current)
    }
  }, [retryCount, delay, timeout, onError])

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
  }

  if (hasError && retryEnabled) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Loading failed
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Content couldn't be loaded. Please try again.
          </p>
        </div>
        
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 mx-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again {retryCount > 0 && `(${retryCount})`}
        </button>
      </div>
    )
  }

  if (isLoading) {
    return fallback
  }

  return children
}

export function LazyImage({ 
  src, 
  alt, 
  className = "", 
  fallbackSrc = null, 
  placeholder = null,
  onLoad = null,
  onError = null 
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const imgRef = useRef()

  useEffect(() => {
    setCurrentSrc(src)
    setIsLoading(true)
    setHasError(false)
  }, [src])

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
    } else {
      setHasError(true)
    }
    onError?.()
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          {placeholder || (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs">Failed to load</span>
          </div>
        </div>
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

export function DataTable({ 
  columns, 
  data, 
  loading = false, 
  error = null, 
  onRetry = null,
  skeletonRows = 5 
}) {
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Error loading data
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {error.message || 'Something went wrong'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {columns.map((column, index) => (
              <th key={index} className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? [...Array(skeletonRows)].map((_, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="py-3 px-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton"></div>
                    </td>
                  ))}
                </tr>
              ))
            : data.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className="py-3 px-4">
                      {column.render ? column.render(row[column.key], row, rowIndex) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      
      {!loading && data.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No data available
        </div>
      )}
    </div>
  )
}

export function InfiniteLoader({ 
  hasMore, 
  isLoading, 
  onLoadMore, 
  threshold = 100,
  children 
}) {
  const sentinelRef = useRef()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore()
        }
      },
      { 
        threshold: 0,
        rootMargin: `${threshold}px`
      }
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoading, onLoadMore, threshold])

  return (
    <div>
      {children}
      
      {hasMore && (
        <div ref={sentinelRef} className="py-4">
          {isLoading ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                Loading more...
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm">
              Scroll for more
            </div>
          )}
        </div>
      )}
    </div>
  )
}