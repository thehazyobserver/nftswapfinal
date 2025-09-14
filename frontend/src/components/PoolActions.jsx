import React from 'react'

export default function PoolActions({ swapPool, stakeReceipt }) {
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded">
      <h4 className="font-semibold mb-2">Actions (placeholder)</h4>
      <div className="text-sm text-gray-700">Swap, Stake, Claim UI will be added after you provide full ABIs for `SwapPool` and `StonerFeePool`.</div>
      <div className="mt-3 flex gap-2">
        <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => alert('Swap UI coming soon')}>Swap NFT</button>
        <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => alert('Stake UI coming soon')}>Stake NFT</button>
        <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={() => alert('Claim Rewards UI coming soon')}>Claim Rewards</button>
      </div>
    </div>
  )
}
