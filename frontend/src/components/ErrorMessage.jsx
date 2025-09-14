import React from 'react'

export default function ErrorMessage({ error, onRetry, className = "" }) {
  if (!error) return null
  
  return (
    <div className={`p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex">
          <div className="text-red-400 mr-2">⚠️</div>
          <div>
            <div className="text-sm font-medium text-red-800 dark:text-red-200">
              Error
            </div>
            <div className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error}
            </div>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700 transition"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}