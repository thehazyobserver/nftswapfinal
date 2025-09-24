import React from 'react'

export function NFTGridSkeleton({ 
  count = 8, 
  columns = { base: 2, sm: 3, md: 4, lg: 6 },
  className = "" 
}) {
  const gridCols = `grid-cols-${columns.base} sm:grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg}`
  
  return (
    <div className={`grid gap-3 ${gridCols} ${className}`}>
      {[...Array(count)].map((_, index) => (
        <div key={index} className="group">
          <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden skeleton relative">
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer" 
                 style={{ animationDelay: `${index * 0.1}s` }} />
            
            {/* Mock NFT content */}
            <div className="absolute inset-0 p-3 flex flex-col justify-between opacity-20">
              <div className="w-6 h-6 bg-gray-400 dark:bg-gray-500 rounded-full ml-auto"></div>
              <div className="space-y-2">
                <div className="w-full h-2 bg-gray-400 dark:bg-gray-500 rounded"></div>
                <div className="w-2/3 h-2 bg-gray-400 dark:bg-gray-500 rounded"></div>
              </div>
            </div>
          </div>
          
          {/* Token ID placeholder */}
          <div className="mt-2 text-center">
            <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded mx-auto skeleton"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PoolCardSkeleton({ className = "" }) {
  return (
    <div className={`p-6 rounded-2xl border shadow-lg bg-white dark:bg-gray-800 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton"></div>
            <div className="space-y-2">
              <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton"></div>
              <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded skeleton"></div>
            </div>
          </div>
          <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded-full skeleton"></div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded skeleton"></div>
              <div className="w-3/4 h-3 bg-gray-200 dark:bg-gray-700 rounded skeleton mx-auto"></div>
            </div>
          ))}
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton"></div>
          <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton"></div>
        </div>
      </div>
    </div>
  )
}

export function PoolDetailSkeleton({ className = "" }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl skeleton mx-auto"></div>
        <div className="space-y-2">
          <div className="w-48 h-6 bg-gray-200 dark:bg-gray-700 rounded skeleton mx-auto"></div>
          <div className="w-64 h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton mx-auto"></div>
        </div>
      </div>
      
      {/* Interface tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex-1 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton mx-1"></div>
        ))}
      </div>
      
      {/* Rewards section */}
      <div className="bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-6">
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-32 h-8 bg-yellow-200 dark:bg-yellow-800/50 rounded skeleton mx-auto"></div>
            <div className="w-24 h-4 bg-yellow-200 dark:bg-yellow-800/50 rounded skeleton mx-auto mt-2"></div>
          </div>
          <div className="w-full h-12 bg-yellow-200 dark:bg-yellow-800/50 rounded-xl skeleton"></div>
        </div>
      </div>
      
      {/* NFT grids */}
      <div className="space-y-6">
        {[...Array(2)].map((_, section) => (
          <div key={section} className="space-y-4">
            <div className="w-48 h-6 bg-gray-200 dark:bg-gray-700 rounded skeleton"></div>
            <NFTGridSkeleton count={6} />
          </div>
        ))}
      </div>
      
      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        <div className="space-y-3">
          <div className="w-full h-14 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton"></div>
          <div className="w-3/4 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton"></div>
        </div>
        <div className="space-y-3">
          <div className="w-full h-14 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton"></div>
          <div className="w-3/4 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton"></div>
        </div>
      </div>
    </div>
  )
}

export function TransactionSkeleton({ message = "Processing transaction...", className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
      {/* Animated transaction icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute inset-2 w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-indigo-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
      </div>
      
      {/* Message */}
      <div className="text-center space-y-2">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {message}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Please confirm the transaction in your wallet
        </div>
      </div>
      
      {/* Progress dots */}
      <div className="flex gap-1 mt-4">
        {[...Array(3)].map((_, i) => (
          <div 
            key={i} 
            className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  )
}

export function ErrorStateSkeleton({ 
  title = "Something went wrong", 
  message = "Please try again later", 
  onRetry,
  className = "" 
}) {
  return (
    <div className={`text-center py-12 px-6 ${className}`}>
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {message}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors duration-200 flex items-center gap-2 mx-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
      )}
    </div>
  )
}

export function SearchSkeleton({ className = "" }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex gap-4">
        <div className="flex-1 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton"></div>
        <div className="w-32 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl skeleton"></div>
      </div>
      
      {/* Filter options */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-4 h-8 bg-gray-200 dark:bg-gray-700 rounded-full skeleton"></div>
        ))}
      </div>
    </div>
  )
}

// Enhanced shimmer animation
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`

// Add global styles for shimmer effect
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = shimmerKeyframes
  document.head.appendChild(styleSheet)
}