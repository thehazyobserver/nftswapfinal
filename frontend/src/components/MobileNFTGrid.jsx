import React from 'react'
import NFTTokenImage from './NFTTokenImage'

export default function MobileNFTGrid({ 
  nfts, 
  selectedTokens, 
  onToggleSelection, 
  maxSelection = null,
  loading = false,
  className = "",
  itemClassName = "",
  showSelect = true 
}) {
  if (loading) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">No NFTs available</p>
      </div>
    )
  }

  const handleNftPress = (nft, e) => {
    e.preventDefault()
    
    if (!showSelect) return
    
    const isSelected = selectedTokens.includes(nft.tokenId)
    const isMaxReached = maxSelection && selectedTokens.length >= maxSelection && !isSelected
    
    if (isMaxReached) return
    
    // Add haptic feedback on supported devices
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
    
    onToggleSelection(nft.tokenId)
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 ${className}`}>
      {nfts.map((nft) => {
        const isSelected = selectedTokens.includes(nft.tokenId)
        const isMaxReached = maxSelection && selectedTokens.length >= maxSelection && !isSelected
        
        return (
          <div
            key={nft.tokenId}
            className={`relative group ${itemClassName}`}
          >
            <button
              onClick={(e) => handleNftPress(nft, e)}
              disabled={!showSelect || isMaxReached}
              className={`
                w-full aspect-square rounded-xl overflow-hidden transition-all duration-200 
                touch-manipulation active:scale-95 focus:outline-none
                ${showSelect ? 'cursor-pointer' : 'cursor-default'}
                ${isSelected 
                  ? 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 shadow-lg' 
                  : isMaxReached 
                  ? 'opacity-40 cursor-not-allowed' 
                  : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 hover:shadow-md'
                }
                ${isSelected ? 'transform scale-95' : 'hover:scale-105'}
              `}
              style={{ 
                minHeight: '44px', // Minimum touch target
                WebkitTapHighlightColor: 'transparent' // Remove iOS tap highlight
              }}
            >
              {/* NFT Image */}
              <div className="w-full h-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                <NFTTokenImage 
                  image={nft.image} 
                  tokenId={nft.tokenId} 
                  size="100%" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Selection Indicator */}
              {showSelect && (
                <div className={`
                  absolute top-2 right-2 w-6 h-6 rounded-full border-2 
                  transition-all duration-200 flex items-center justify-center
                  ${isSelected 
                    ? 'bg-indigo-500 border-indigo-500 text-white' 
                    : 'bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600 backdrop-blur-sm'
                  }
                `}>
                  {isSelected && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              )}
              
              {/* Max Selection Warning */}
              {isMaxReached && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-white text-xs font-medium px-2 py-1 bg-black/80 rounded">
                    Max {maxSelection}
                  </div>
                </div>
              )}
            </button>
            
            {/* Token ID */}
            <div className="mt-2 text-center">
              <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                #{nft.tokenId}
              </span>
            </div>
            
            {/* Long Press Indicator (subtle) */}
            {showSelect && !isSelected && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-1 left-1 w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full opacity-0 group-active:opacity-50 transition-opacity duration-100"></div>
              </div>
            )}
          </div>
        )
      })}
      
      {/* Selection Summary for Mobile */}
      {showSelect && selectedTokens.length > 0 && (
        <div className="col-span-full mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
              {selectedTokens.length} selected
              {maxSelection && ` (${maxSelection - selectedTokens.length} remaining)`}
            </span>
            {selectedTokens.length > 0 && (
              <button 
                onClick={() => selectedTokens.forEach(tokenId => onToggleSelection(tokenId))}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium touch-manipulation"
                style={{ minHeight: '32px', minWidth: '60px' }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}