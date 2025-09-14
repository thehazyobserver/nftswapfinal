import React from 'react'
import PoolActions from './PoolActions'

export default function PoolDetail({ pool, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white w-11/12 md:w-2/3 lg:w-1/2 p-6 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Pool Details</h3>
          <button className="text-gray-600" onClick={onClose}>Close</button>
        </div>

        <div className="space-y-2">
          <div><strong>Collection:</strong> {pool.nftCollection}</div>
          <div><strong>Swap Pool:</strong> {pool.swapPool}</div>
          <div><strong>Stake Receipt:</strong> {pool.stakeReceipt}</div>
          <div><strong>Creator:</strong> {pool.creator}</div>
          <div><strong>Created:</strong> {pool.createdAt}</div>
          <div><strong>Active:</strong> {pool.active ? 'Yes' : 'No'}</div>
        </div>

        <div className="mt-6 flex gap-2">
          <a className="px-4 py-2 bg-indigo-600 text-white rounded" href={`${import.meta.env.VITE_EXPLORER_BASE || 'https://explorer.sonic.org'}/address/${pool.swapPool}`} target="_blank" rel="noreferrer">Explorer</a>
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => navigator.clipboard.writeText(pool.swapPool)}>Copy Address</button>
        </div>

        <PoolActions swapPool={pool.swapPool} stakeReceipt={pool.stakeReceipt} />
      </div>
    </div>
  )
}
