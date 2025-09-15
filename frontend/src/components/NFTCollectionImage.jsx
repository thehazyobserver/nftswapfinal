// NFTCollectionImage.jsx
import React from 'react'

// You can expand this mapping or fetch from a remote API
const collectionImages = {
  '0xB6748d708B5Cda0eA8c53e7072566971FCCb6b49': 'https://nftstorage.link/stoner.png', // Stoner
  '0xE3941DB58B9D35410A66636da07c9B28b878B89E': 'https://nftstorage.link/boat.png', // Boat
  // Add more as needed
}

export default function NFTCollectionImage({ address, size = 48 }) {
  const [broken, setBroken] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  
  const img = collectionImages[address?.toLowerCase()]
  
  if (!img || broken) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="bg-gradient-to-br from-accent/20 to-indigo-500/20 rounded flex items-center justify-center text-accent text-xs font-bold border-2 border-accent/20"
      >
        NFT
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
