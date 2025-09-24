import React, { useState, useRef, useEffect } from 'react'

export default function PullToRefresh({ 
  onRefresh, 
  children, 
  disabled = false,
  pullDistance = 80,
  snapBackDuration = 300 
}) {
  const [pullY, setPullY] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [canPull, setCanPull] = useState(false)
  
  const containerRef = useRef(null)
  const touchStartY = useRef(0)
  const currentY = useRef(0)

  // Check if we can pull (at top of scrollable content)
  const checkCanPull = () => {
    if (!containerRef.current) return false
    const scrollTop = containerRef.current.scrollTop
    return scrollTop <= 0
  }

  const handleTouchStart = (e) => {
    if (disabled || isRefreshing) return
    
    touchStartY.current = e.touches[0].clientY
    currentY.current = e.touches[0].clientY
    setCanPull(checkCanPull())
  }

  const handleTouchMove = (e) => {
    if (disabled || isRefreshing || !canPull) return

    currentY.current = e.touches[0].clientY
    const deltaY = currentY.current - touchStartY.current

    if (deltaY > 0 && checkCanPull()) {
      e.preventDefault() // Prevent scroll
      setIsPulling(true)
      
      // Apply resistance - slower movement the further you pull
      const resistance = Math.min(deltaY / 3, pullDistance)
      setPullY(resistance)
    }
  }

  const handleTouchEnd = async () => {
    if (disabled || !isPulling) return

    setIsPulling(false)

    if (pullY >= pullDistance && onRefresh) {
      setIsRefreshing(true)
      
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
        setPullY(0)
      }
    } else {
      // Snap back
      setPullY(0)
    }
  }

  // Handle mouse events for testing on desktop
  const handleMouseDown = (e) => {
    if (disabled || isRefreshing) return
    touchStartY.current = e.clientY
    currentY.current = e.clientY
    setCanPull(checkCanPull())
    
    const handleMouseMove = (e) => {
      currentY.current = e.clientY
      const deltaY = currentY.current - touchStartY.current

      if (deltaY > 0 && checkCanPull()) {
        setIsPulling(true)
        const resistance = Math.min(deltaY / 3, pullDistance)
        setPullY(resistance)
      }
    }

    const handleMouseUp = async () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      
      if (!isPulling) return
      setIsPulling(false)

      if (pullY >= pullDistance && onRefresh) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } catch (error) {
          console.error('Refresh failed:', error)
        } finally {
          setIsRefreshing(false)
          setPullY(0)
        }
      } else {
        setPullY(0)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const refreshProgress = Math.min(pullY / pullDistance, 1)
  const shouldTrigger = pullY >= pullDistance

  return (
    <div 
      ref={containerRef}
      className="relative overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      style={{
        transform: `translateY(${pullY}px)`,
        transition: isPulling ? 'none' : `transform ${snapBackDuration}ms ease-out`
      }}
    >
      {/* Pull to refresh indicator */}
      <div 
        className={`absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ${
          pullY > 10 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          height: `${pullY}px`,
          transform: `translateY(-${pullY}px)`
        }}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          {/* Refresh Icon */}
          <div className="relative">
            {isRefreshing ? (
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <div 
                className="w-8 h-8 flex items-center justify-center transition-transform duration-200"
                style={{
                  transform: `rotate(${shouldTrigger ? 180 : pullY * 2}deg)`
                }}
              >
                <svg 
                  className={`w-6 h-6 transition-colors duration-200 ${
                    shouldTrigger ? 'text-green-500' : 'text-indigo-500'
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 14l-7-7m0 0l-7 7m7-7v18" 
                  />
                </svg>
              </div>
            )}
            
            {/* Progress Ring */}
            <div 
              className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-700"
              style={{
                background: `conic-gradient(from 0deg, ${
                  shouldTrigger ? '#10b981' : '#6366f1'
                } ${refreshProgress * 360}deg, transparent 0deg)`
              }}
            />
          </div>
          
          {/* Status Text */}
          <p className={`text-xs font-medium transition-colors duration-200 ${
            isRefreshing 
              ? 'text-blue-600 dark:text-blue-400' 
              : shouldTrigger 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-indigo-600 dark:text-indigo-400'
          }`}>
            {isRefreshing 
              ? 'Refreshing...' 
              : shouldTrigger 
              ? 'Release to refresh' 
              : 'Pull to refresh'
            }
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div className="min-h-full">
        {children}
      </div>
    </div>
  )
}