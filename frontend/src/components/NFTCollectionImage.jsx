// NFTCollectionImage.jsx
import React, { useState, useEffect } from 'react'
import { 
  getCollectionData, 
  getCollectionImage, 
  generateGradient, 
  getCollectionInitials,
  config 
} from '../config/collectionImages'

export default function NFTCollectionImage({ address, collectionName, size = 48, showTooltip = false }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  
  // Get collection data and images
  const collectionData = getCollectionData(address)
  const imageUrls = getCollectionImage(address)
  
  // Create array of image URLs to try (primary -> fallback -> default)
  const imagesToTry = []
  if (imageUrls?.primary) imagesToTry.push(imageUrls.primary)
  if (imageUrls?.fallback) imagesToTry.push(imageUrls.fallback)
  if (imageUrls?.default) imagesToTry.push(imageUrls.default)
  
  const currentImageUrl = imagesToTry[currentImageIndex]
  
  // Handle image load error - try next image in the array
  const handleImageError = () => {
    if (currentImageIndex < imagesToTry.length - 1) {
      setCurrentImageIndex(prev => prev + 1)
      setLoading(true)
    } else {
      setImageError(true)
      setLoading(false)
    }
  }
  
  const handleImageLoad = () => {
    setLoading(false)
    setImageError(false)
  }
  
  // Reset when address changes
  useEffect(() => {
    setCurrentImageIndex(0)
    setImageError(false)
    setLoading(true)
  }, [address])
  
  // If no images available or all failed, show gradient with initials
  if (!currentImageUrl || imageError) {
    const initials = getCollectionInitials(collectionData?.name || collectionName)
    const gradient = collectionData?.customGradient || generateGradient(collectionName || address)
    const fontSize = size <= 32 ? 'text-xs' : size <= 48 ? 'text-sm' : 'text-base'
    
    const gradientElement = (
      <div 
        style={{ width: size, height: size }} 
        className={`bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center text-white font-bold ${fontSize} shadow-lg cursor-pointer transition-transform hover:scale-105`}
        onMouseEnter={() => showTooltip && setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        {initials}
      </div>
    )
    
    if (showTooltip && collectionData?.description) {
      return (
        <div className="relative">
          {gradientElement}
          {tooltipVisible && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap">
              {collectionData.description}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </div>
      )
    }
    
    return gradientElement
  }
  
  // Show image with optional tooltip
  const imageElement = (
    <div className="relative">
      {loading && (
        <div 
          style={{ width: size, height: size }} 
          className="absolute inset-0 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse"
        />
      )}
      <img 
        src={currentImageUrl} 
        alt={collectionData?.name || collectionName || 'NFT Collection'} 
        style={{ width: size, height: size, borderRadius: 8 }} 
        onError={handleImageError}
        onLoad={handleImageLoad}
        className={`transition-all duration-200 hover:scale-105 shadow-lg ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  )
  
  if (showTooltip && collectionData?.description) {
    return (
      <div className="relative">
        <div
          onMouseEnter={() => setTooltipVisible(true)}
          onMouseLeave={() => setTooltipVisible(false)}
        >
          {imageElement}
        </div>
        {tooltipVisible && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap">
            <div className="font-semibold">{collectionData.name}</div>
            <div className="text-xs text-gray-300">{collectionData.description}</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    )
  }
  
  return imageElement
}
