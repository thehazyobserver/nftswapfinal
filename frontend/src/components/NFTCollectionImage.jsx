// NFTCollectionImage.jsx
import React from 'react'

// You can expand this mapping or fetch from a remote API
const collectionImages = {
  '0xe93755cC3b462E193023cf66c0aE3d3FB2E5b8f4': 'https://nftstorage.link/stoner.png', // Stoner
  '0xE3941DB58B9D35410A66636da07c9B28b878B89E': 'https://nftstorage.link/boat.png', // Boat
  // Add more as needed
}

export default function NFTCollectionImage({ address, size = 48 }) {
  const [broken, setBroken] = React.useState(false)
  const img = collectionImages[address?.toLowerCase()]
  if (!img || broken) return <div style={{ width: size, height: size }} className="bg-gray-200 rounded" />
  return <img src={img} alt="NFT Collection" style={{ width: size, height: size, borderRadius: 8 }} onError={() => setBroken(true)} />
}
