import React from 'react'

export default function NFTTokenImage({ image, tokenId, size = 64 }) {
  const [broken, setBroken] = React.useState(false)
  if (!image || broken) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="bg-gradient-to-br from-gray-300 to-gray-400 rounded flex items-center justify-center text-gray-600 text-xs font-mono"
      >
        #{tokenId}
      </div>
    )
  }
  return <img src={image} alt={`NFT #${tokenId}`} style={{ width: size, height: size, borderRadius: 8 }} onError={() => setBroken(true)} />
}
