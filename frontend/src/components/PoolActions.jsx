import React, { useState } from 'react'
import { ethers } from 'ethers'
import SwapPoolABI from '../abis/SwapPool.json'
import StakeReceiptABI from '../abis/StakeReceipt.json'

export default function PoolActions({ swapPool, stakeReceipt }) {
  const [status, setStatus] = useState('')
  const [tokenId, setTokenId] = useState('')
  const [receiptTokenId, setReceiptTokenId] = useState('')
  const [loading, setLoading] = useState(false)

  // Helper to get signer
  const getSigner = async () => {
    if (!window.ethereum) throw new Error('Wallet not found')
    const provider = new ethers.BrowserProvider(window.ethereum)
    return provider.getSigner()
  }

  // Stake NFT
  const handleStake = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      const tx = await contract.stakeNFT(tokenId)
      setStatus('Staking...')
      await tx.wait()
      setStatus('Stake successful!')
    } catch (e) {
      setStatus('Stake failed: ' + (e.reason || e.message))
    }
    setLoading(false)
  }

  // Unstake NFT
  const handleUnstake = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      const tx = await contract.unstakeNFT(receiptTokenId)
      setStatus('Unstaking...')
      await tx.wait()
      setStatus('Unstake successful!')
    } catch (e) {
      setStatus('Unstake failed: ' + (e.reason || e.message))
    }
    setLoading(false)
  }

  // Claim Rewards
  const handleClaim = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      const tx = await contract.claimRewards()
      setStatus('Claiming rewards...')
      await tx.wait()
      setStatus('Rewards claimed!')
    } catch (e) {
      setStatus('Claim failed: ' + (e.reason || e.message))
    }
    setLoading(false)
  }

  // Swap NFT
  const [swapTokenId, setSwapTokenId] = useState('')
  const [swapValue, setSwapValue] = useState('')
  const handleSwap = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      // Get swap fee
      const fee = await contract.swapFeeInWei()
      const tx = await contract.swapNFT(swapTokenId, { value: fee })
      setStatus('Swapping...')
      await tx.wait()
      setStatus('Swap successful!')
    } catch (e) {
      setStatus('Swap failed: ' + (e.reason || e.message))
    }
    setLoading(false)
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded">
      <h4 className="font-semibold mb-2">Pool Actions</h4>
      <div className="space-y-4">
        <div>
          <div className="font-semibold mb-1">Stake NFT</div>
          <input type="text" className="border px-2 py-1 rounded mr-2" placeholder="Token ID" value={tokenId} onChange={e => setTokenId(e.target.value)} disabled={loading} />
          <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={handleStake} disabled={loading || !tokenId}>Stake</button>
        </div>
        <div>
          <div className="font-semibold mb-1">Unstake NFT</div>
          <input type="text" className="border px-2 py-1 rounded mr-2" placeholder="Receipt Token ID" value={receiptTokenId} onChange={e => setReceiptTokenId(e.target.value)} disabled={loading} />
          <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={handleUnstake} disabled={loading || !receiptTokenId}>Unstake</button>
        </div>
        <div>
          <div className="font-semibold mb-1">Claim Rewards</div>
          <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={handleClaim} disabled={loading}>Claim</button>
        </div>
        <div>
          <div className="font-semibold mb-1">Swap NFT</div>
          <input type="text" className="border px-2 py-1 rounded mr-2" placeholder="Token ID In" value={swapTokenId} onChange={e => setSwapTokenId(e.target.value)} disabled={loading} />
          <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={handleSwap} disabled={loading || !swapTokenId}>Swap</button>
        </div>
        {status && <div className="mt-2 text-sm text-blue-700">{status}</div>}
      </div>
    </div>
  )
}
