import React from 'react'

export default function NFTLoadingSkeleton({ count = 6, size = 56 }) {
  return (
    <div className="flex gap-3 flex-wrap">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col items-center animate-pulse">
          <div 
            className="bg-gray-300 dark:bg-gray-700 rounded-xl border-2 border-gray-300 dark:border-gray-600" 
            style={{ width: size + 8, height: size + 24 }}
          >
            <div 
              className="bg-gray-400 dark:bg-gray-600 rounded-lg m-1" 
              style={{ width: size, height: size }}
            />
            <div className="h-3 bg-gray-400 dark:bg-gray-600 rounded mx-2 mt-1" />
          </div>
        </div>
      ))}
    </div>
  )
}