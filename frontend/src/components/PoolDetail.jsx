import React from 'react'
import PoolActionsNew from './PoolActionsNew'
import NFTCollectionImage from './NFTCollectionImage'

export default function PoolDetail({ pool, collectionName, onClose, provider }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="sticky top-0 bg-white dark:bg-gray-800 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">Pool Details</h3>
            <button 
              className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition flex-shrink-0"
              onClick={onClose}
            >
              ✕ Close
            </button>
          </div>
        </div>        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <NFTCollectionImage address={pool.nftCollection} collectionName={collectionName} size={64} />
          <div className="w-full">
            <div className="font-semibold text-base sm:text-lg text-blue-600 dark:text-blue-400 mb-1">Collection: <span className="font-mono text-gray-600 dark:text-gray-400">{pool.nftCollection.slice(0, 6)}...{pool.nftCollection.slice(-4)}</span></div>
            <div className="text-xs text-gray-600 dark:text-gray-400">SwapPool: <span className="font-mono">{pool.swapPool.slice(0, 6)}...{pool.swapPool.slice(-4)}</span></div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Receipt: <span className="font-mono">{pool.stakeReceipt.slice(0, 6)}...{pool.stakeReceipt.slice(-4)}</span></div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Creator: {pool.creator}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Created: {pool.createdAt}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Active: {pool.active ? 'Yes' : 'No'}</div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <a className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded shadow transition" href={`${import.meta.env.VITE_EXPLORER_BASE || 'https://explorer.sonic.org'}/address/${pool.swapPool}`} target="_blank" rel="noreferrer">Explorer</a>
          <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition" onClick={() => navigator.clipboard.writeText(pool.swapPool)}>Copy Address</button>
        </div>

  <PoolActionsNew swapPool={pool.swapPool} stakeReceipt={pool.stakeReceipt} provider={provider} />
      </div>
    </div>
  )
}
