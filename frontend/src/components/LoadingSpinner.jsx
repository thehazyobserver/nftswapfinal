import React from 'react'

export default function LoadingSpinner({ size = 'md', text = '', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }
  
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} border-2 border-accent border-t-transparent rounded-full animate-spin`}></div>
      {text && <span className="text-sm text-muted dark:text-muted">{text}</span>}
    </div>
  )
}