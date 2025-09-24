import React from 'react'

export default function NFTLoadingSkeleton({ count = 6, size = 56 }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col items-center">
          <div 
            className="shimmer rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm" 
            style={{ width: size + 8, height: size + 32 }}
          >
            <div 
              className="bg-gray-300 dark:bg-gray-600 rounded-lg m-1 animate-pulse" 
              style={{ width: size, height: size }}
            />
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mx-2 mt-2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}