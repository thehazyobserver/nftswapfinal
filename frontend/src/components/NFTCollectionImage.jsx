// NFTCollectionImage.jsx
import React from 'react'

// You can expand this mapping or fetch from a remote API
const collectionImages = {
  '0xB6748d708B5Cda0eA8c53e7072566971FCCb6b49': 'https://nftstorage.link/stoner.png', // Stoner
  '0xE3941DB58B9D35410A66636da07c9B28b878B89E': 'https://nftstorage.link/boat.png', // Boat
  // Add more as needed
}

// Generate a consistent gradient based on the collection name or address
function generateGradient(text) {
  if (!text) return 'from-gray-400 to-gray-600'
  
  const hash = text.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  const gradients = [
    'from-blue-400 to-purple-600',
    'from-purple-400 to-pink-600',
    'from-pink-400 to-red-600',
    'from-red-400 to-orange-600',
    'from-orange-400 to-yellow-600',
    'from-yellow-400 to-green-600',
    'from-green-400 to-teal-600',
    'from-teal-400 to-blue-600',
    'from-indigo-400 to-purple-600',
    'from-violet-400 to-pink-600',
    'from-cyan-400 to-blue-600',
    'from-emerald-400 to-teal-600'
  ]
  
  return gradients[Math.abs(hash) % gradients.length]
}

// Extract initials from collection name
function getInitials(name) {
  if (!name || name === 'Unknown Collection' || name === 'Loading...') {
    return '?'
  }
  
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  
  return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('')
}

export default function NFTCollectionImage({ address, collectionName, size = 48 }) {
  const [broken, setBroken] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  
  const img = collectionImages[address?.toLowerCase()]
  
  if (!img || broken) {
    const initials = getInitials(collectionName)
    const gradient = generateGradient(collectionName || address)
    const fontSize = size <= 32 ? 'text-xs' : size <= 48 ? 'text-sm' : 'text-base'
    
    return (
      <div 
        style={{ width: size, height: size }} 
        className={`bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center text-white font-bold ${fontSize} shadow-lg`}
      >
        {initials}
      </div>
    )
  }
  
  return (
    <div className="relative">
      {loading && (
        <div 
          style={{ width: size, height: size }} 
          className="absolute inset-0 bg-gray-300 rounded animate-pulse"
        />
      )}
      <img 
        src={img} 
        alt="NFT Collection" 
        style={{ width: size, height: size, borderRadius: 8 }} 
        onError={() => setBroken(true)}
        onLoad={() => setLoading(false)}
        className={loading ? 'opacity-0' : 'opacity-100'}
      />
    </div>
  )
}
