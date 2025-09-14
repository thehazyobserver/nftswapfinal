import React from 'react'

export default function NFTTokenImage({ image, tokenId, size = 64 }) {
  const [broken, setBroken] = React.useState(false)
  if (!image || broken) return <div style={{ width: size, height: size }} className="bg-gray-200 rounded" />
  return <img src={image} alt={`NFT #${tokenId}`} style={{ width: size, height: size, borderRadius: 8 }} onError={() => setBroken(true)} />
}
