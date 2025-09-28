// Collection Images Configuration
// This file makes it easy to add custom thumbnails for NFT collection swap pools
// Simply add your collection address and image URL to the collections object below

const collections = {
  // Existing collections
  '0xB6748d708B5Cda0eA8c53e7072566971FCCb6b49': {
    name: 'Stoner NFT',
    image: 'https://nftstorage.link/stoner.png',
    fallback: '/images/collections/stoner.png', // Local fallback
    description: 'The original Stoner NFT collection'
  },
  
  '0xE3941DB58B9D35410A66636da07c9B28b878B89E': {
    name: 'Boat NFT',
    image: 'https://nftstorage.link/boat.png',
    fallback: '/images/collections/boat.png', // Local fallback
    description: 'Boat NFT collection'
  },

  // BOAT MONEY Collection - NFT Collection Address (not swap pool address)
  '0x75f5EE19Bc352d19B1791684faDf23b948EDaBA3': {
    name: 'BOAT MONEY',
    // Using a working boat/yacht image from a reliable source
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop&crop=center',
    fallback: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0idXJsKCNncmFkaWVudDApIi8+CjxwYXRoIGQ9Ik0xMCAyNUwxNSAyMEwyNSAyMkwzMCAyNUgxMFoiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8cGF0aCBkPSJNMTUgMjBWMTVMMjAgMTJMMjUgMTVWMjAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDAiIHgxPSIwIiB5MT0iMCIgeDI9IjQwIiB5Mj0iNDAiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iIzM5ODNGNiIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwRkJCRjkiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K',
    description: 'Luxury yacht collection for boat enthusiasts',
    customGradient: 'from-blue-400 to-cyan-600' // Ocean-themed gradient
  },

  // Add new collections here following this format:
  // '0xYourCollectionAddress': {
  //   name: 'Your Collection Name',
  //   image: 'https://your-image-url.com/image.png', // Primary image URL
  //   fallback: '/images/collections/your-collection.png', // Local fallback image
  //   description: 'Description of your collection',
  //   customGradient: 'from-blue-500 to-purple-600' // Optional custom gradient
  // },

  // Example template for easy copying:
  // '0x0000000000000000000000000000000000000000': {
  //   name: 'Template Collection',
  //   image: 'https://example.com/image.png',
  //   fallback: '/images/collections/template.png',
  //   description: 'Template for new collections'
  // },
}

// Configuration options
const config = {
  // Default image to use when no collection image is found
  defaultImage: '/images/collections/default.png',
  
  // Whether to show collection descriptions in tooltips
  showDescriptions: true,
  
  // Image loading timeout (ms)
  loadTimeout: 5000,
  
  // Default gradient colors for collections without custom images
  defaultGradients: [
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
}

// Helper function to get collection data
export function getCollectionData(address) {
  if (!address) return null
  return collections[address.toLowerCase()] || null
}

// Helper function to get all collections (for admin interface)
export function getAllCollections() {
  return collections
}

// Helper function to add a new collection (for admin interface)  
export function addCollection(address, data) {
  collections[address.toLowerCase()] = data
  return true
}

// Helper function to get collection image with fallback logic
export function getCollectionImage(address) {
  const collection = getCollectionData(address)
  if (!collection) return null
  
  return {
    primary: collection.image,
    fallback: collection.fallback,
    default: config.defaultImage
  }
}

// Helper function to generate consistent gradient for collections without images
export function generateGradient(text) {
  if (!text) return 'from-gray-400 to-gray-600'
  
  const hash = text.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  return config.defaultGradients[Math.abs(hash) % config.defaultGradients.length]
}

// Helper function to extract initials from collection name
export function getCollectionInitials(name) {
  if (!name || name === 'Unknown Collection' || name === 'Loading...') {
    return '?'
  }
  
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  
  return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('')
}

export { collections, config }
export default collections