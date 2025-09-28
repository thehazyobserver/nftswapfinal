import React from 'react'

export default function NFTTokenImage({ image, tokenId, size = 64, isReceiptToken = false, poolSlotId, name }) {
  const [broken, setBroken] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  
  if (!image || broken) {
    // Special styling for receipt tokens
    if (isReceiptToken) {
      return (
        <div 
          style={{ width: size, height: size }} 
          className="bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-lg flex items-center justify-center text-yellow-800 dark:text-yellow-200 text-xs font-mono border-2 border-yellow-300 dark:border-yellow-600 shadow-md"
          title={name || `Receipt Token #${tokenId}`}
        >
          <div className="text-center">
            <div className="text-lg mb-1">🧾</div>
            <div className="text-[10px]">#{poolSlotId || tokenId}</div>
          </div>
        </div>
      )
    }
    
    // Regular NFT placeholder
    return (
      <div 
        style={{ width: size, height: size }} 
        className="bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 text-xs font-mono border border-gray-300 dark:border-gray-600 shadow-sm"
      >
        <div className="text-center">
          <div className="text-lg mb-1">🖼️</div>
          <div>#{tokenId}</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {loading && (
        <div 
          style={{ width: size, height: size }} 
          className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center animate-pulse"
        >
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img 
        src={image} 
        alt={`NFT #${tokenId}`} 
        style={{ width: size, height: size }} 
        className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 object-cover"
        onError={() => setBroken(true)}
        onLoad={() => setLoading(false)}
      />
    </div>
  )
}
