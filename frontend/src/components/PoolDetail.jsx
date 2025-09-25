import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import PoolActionsNew from './PoolActionsNew'
import NFTCollectionImage from './NFTCollectionImage'
import SwapPoolABI from '../abis/SwapPool.json'

export default function PoolDetail({ pool, collectionName, onClose, provider }) {
  const [poolFee, setPoolFee] = useState(null)

  useEffect(() => {
    const fetchPoolFee = async () => {
      try {
        if (!provider || !pool.swapPool) return
        
        const contract = new ethers.Contract(pool.swapPool, SwapPoolABI, provider)
        const feeInWei = await contract.swapFeeInWei()
        const feeInEth = ethers.formatEther(feeInWei)
        setPoolFee(feeInEth)
      } catch (error) {
        console.error('Error fetching pool fee:', error)
        setPoolFee('N/A')
      }
    }

    fetchPoolFee()
  }, [pool.swapPool, provider])

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
            <div className="font-semibold text-base sm:text-lg text-blue-600 dark:text-blue-400 mb-1">Collection: <span className="text-gray-800 dark:text-gray-200">{collectionName || 'Loading...'}</span></div>
            <div className="text-xs text-gray-600 dark:text-gray-400">SwapPool: <span className="font-mono">{pool.swapPool.slice(0, 6)}...{pool.swapPool.slice(-4)}</span></div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Receipt: <span className="font-mono">{pool.stakeReceipt.slice(0, 6)}...{pool.stakeReceipt.slice(-4)}</span></div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Creator: {pool.creator}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Created: {pool.createdAt}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Active: {pool.active ? 'Yes' : 'No'}</div>
            <div className="flex items-center gap-2 mt-2">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Swap Fee: {poolFee ? `${poolFee} S` : 'Loading...'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 flex-wrap">
          <a className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200" href={`${import.meta.env.VITE_EXPLORER_BASE || 'https://explorer.sonic.org'}/address/${pool.swapPool}`} target="_blank" rel="noreferrer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Explorer
          </a>
          <a className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200" href={`https://nft.paintswap.io/sonic/collections/${pool.nftCollection}`} target="_blank" rel="noreferrer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 3v1h6V3H9zm2 5a1 1 0 100 2 1 1 0 000-2zm0 4a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
            PaintSwap
          </a>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-200" onClick={() => navigator.clipboard.writeText(pool.swapPool)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Address
          </button>
        </div>

        <div className="mt-8">
          <PoolActionsNew swapPool={pool.swapPool} stakeReceipt={pool.stakeReceipt} provider={provider} />
        </div>
      </div>
    </div>
  )
}
