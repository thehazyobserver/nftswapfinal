import React, { useState, useEffect } from 'react'
import { getAllCollections, addCollection } from '../config/collectionImages'
import NFTCollectionImage from './NFTCollectionImage'

export default function CollectionImageAdmin() {
  const [collections, setCollections] = useState({})
  const [newCollection, setNewCollection] = useState({
    address: '',
    name: '',
    image: '',
    fallback: '',
    description: '',
    customGradient: ''
  })
  const [showAdmin, setShowAdmin] = useState(false)
  const [previewSize, setPreviewSize] = useState(64)

  useEffect(() => {
    setCollections(getAllCollections())
  }, [])

  const handleAddCollection = () => {
    if (!newCollection.address || !newCollection.name) {
      alert('Address and name are required!')
      return
    }

    try {
      const collectionData = {
        name: newCollection.name,
        image: newCollection.image || undefined,
        fallback: newCollection.fallback || undefined,
        description: newCollection.description || undefined,
        customGradient: newCollection.customGradient || undefined
      }

      // Clean up undefined values
      Object.keys(collectionData).forEach(key => {
        if (collectionData[key] === undefined || collectionData[key] === '') {
          delete collectionData[key]
        }
      })

      addCollection(newCollection.address, collectionData)
      setCollections(getAllCollections())
      
      // Reset form
      setNewCollection({
        address: '',
        name: '',
        image: '',
        fallback: '',
        description: '',
        customGradient: ''
      })

      alert('Collection added successfully! Note: This is only temporary in this session. To make it permanent, add it to /src/config/collectionImages.js')
    } catch (error) {
      alert('Error adding collection: ' + error.message)
    }
  }

  const generateConfigCode = () => {
    const configEntries = Object.entries(collections).map(([address, data]) => {
      const entries = Object.entries(data)
        .filter(([_, value]) => value !== undefined && value !== '')
        .map(([key, value]) => `    ${key}: '${value}'`)
        .join(',\n')
      
      return `  '${address}': {\n${entries}\n  }`
    }).join(',\n\n')

    return `// Copy this code to /src/config/collectionImages.js\nconst collections = {\n${configEntries}\n}`
  }

  if (!showAdmin) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowAdmin(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg text-sm font-medium"
        >
          ⚙️ Manage Collection Images
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            🎨 Collection Image Manager
          </h2>
          <button
            onClick={() => setShowAdmin(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Add New Collection */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Add New Collection</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Collection Address *
                  </label>
                  <input
                    type="text"
                    value={newCollection.address}
                    onChange={(e) => setNewCollection({...newCollection, address: e.target.value})}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    value={newCollection.name}
                    onChange={(e) => setNewCollection({...newCollection, name: e.target.value})}
                    placeholder="My Awesome NFT Collection"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Primary Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={newCollection.image}
                    onChange={(e) => setNewCollection({...newCollection, image: e.target.value})}
                    placeholder="https://example.com/image.png"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fallback Image Path (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCollection.fallback}
                    onChange={(e) => setNewCollection({...newCollection, fallback: e.target.value})}
                    placeholder="/images/collections/my-collection.png"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newCollection.description}
                    onChange={(e) => setNewCollection({...newCollection, description: e.target.value})}
                    placeholder="Description of your collection"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Gradient (Optional)
                  </label>
                  <select
                    value={newCollection.customGradient}
                    onChange={(e) => setNewCollection({...newCollection, customGradient: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Auto-generate gradient</option>
                    <option value="from-blue-400 to-purple-600">Blue to Purple</option>
                    <option value="from-purple-400 to-pink-600">Purple to Pink</option>
                    <option value="from-pink-400 to-red-600">Pink to Red</option>
                    <option value="from-red-400 to-orange-600">Red to Orange</option>
                    <option value="from-orange-400 to-yellow-600">Orange to Yellow</option>
                    <option value="from-yellow-400 to-green-600">Yellow to Green</option>
                    <option value="from-green-400 to-teal-600">Green to Teal</option>
                    <option value="from-teal-400 to-blue-600">Teal to Blue</option>
                  </select>
                </div>

                {/* Preview */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Preview (Size: {previewSize}px)
                  </label>
                  <div className="flex items-center gap-4">
                    <NFTCollectionImage 
                      address={newCollection.address}
                      collectionName={newCollection.name}
                      size={previewSize}
                      showTooltip={true}
                    />
                    <div className="flex-1">
                      <input
                        type="range"
                        min="32"
                        max="128"
                        value={previewSize}
                        onChange={(e) => setPreviewSize(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Drag to change preview size
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddCollection}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Add Collection
                </button>
              </div>
            </div>

            {/* Existing Collections */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Current Collections ({Object.keys(collections).length})
              </h3>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(collections).map(([address, data]) => (
                  <div key={address} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <NFTCollectionImage 
                        address={address}
                        collectionName={data.name}
                        size={48}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">{data.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">{address}</p>
                        {data.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{data.description}</p>
                        )}
                        <div className="flex gap-2 mt-2 text-xs">
                          {data.image && <span className="px-2 py-1 bg-green-100 text-green-700 rounded">External URL</span>}
                          {data.fallback && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Local Fallback</span>}
                          {data.customGradient && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Custom Gradient</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Export Config */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Export Configuration</h4>
                <textarea
                  value={generateConfigCode()}
                  readOnly
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-xs"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(generateConfigCode())}
                  className="mt-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}