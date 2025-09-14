import React from 'react'
import PoolActions from './PoolActions'
import NFTCollectionImage from './NFTCollectionImage'

export default function PoolDetail({ pool, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-card dark:bg-card w-11/12 md:w-2/3 lg:w-1/2 p-4 sm:p-6 rounded-2xl shadow-xl border border-accent/10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-accent">Pool Details</h3>
          <button className="text-muted dark:text-muted hover:text-accent" onClick={onClose}>Close</button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <NFTCollectionImage address={pool.nftCollection} size={64} />
          <div className="w-full">
            <div className="font-semibold text-base sm:text-lg text-accent mb-1">Collection: <span className="font-mono text-muted dark:text-muted">{pool.nftCollection.slice(0, 6)}...{pool.nftCollection.slice(-4)}</span></div>
            <div className="text-xs text-muted dark:text-muted">SwapPool: <span className="font-mono">{pool.swapPool.slice(0, 6)}...{pool.swapPool.slice(-4)}</span></div>
            <div className="text-xs text-muted dark:text-muted">Receipt: <span className="font-mono">{pool.stakeReceipt.slice(0, 6)}...{pool.stakeReceipt.slice(-4)}</span></div>
            <div className="text-xs text-muted dark:text-muted">Creator: {pool.creator}</div>
            <div className="text-xs text-muted dark:text-muted">Created: {pool.createdAt}</div>
            <div className="text-xs text-muted dark:text-muted">Active: {pool.active ? 'Yes' : 'No'}</div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <a className="px-4 py-2 bg-accent text-white rounded shadow hover:bg-accent/80 transition" href={`${import.meta.env.VITE_EXPLORER_BASE || 'https://explorer.sonic.org'}/address/${pool.swapPool}`} target="_blank" rel="noreferrer">Explorer</a>
          <button className="px-4 py-2 bg-secondary text-text rounded hover:bg-accent/20" onClick={() => navigator.clipboard.writeText(pool.swapPool)}>Copy Address</button>
        </div>

        <PoolActions swapPool={pool.swapPool} stakeReceipt={pool.stakeReceipt} />
      </div>
    </div>
  )
}
