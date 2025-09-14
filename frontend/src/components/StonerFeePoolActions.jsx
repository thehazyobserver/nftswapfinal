import React, { useState } from 'react'
import { ethers } from 'ethers'
import StonerFeePoolABI from '../abis/StonerFeePool.json'

// TODO: Replace with your actual StonerFeePool contract address
const STONER_FEE_POOL_ADDRESS = '0xF589111A4Af712142E68ce917751a4BFB8966dEe'

export default function StonerFeePoolActions() {
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const getSigner = async () => {
    if (!window.ethereum) throw new Error('Wallet not found')
    const provider = new ethers.BrowserProvider(window.ethereum)
    return provider.getSigner()
  }

  // Stake (assumes ERC20, adjust if different)
  const handleStake = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      // If staking is via a function like stake(amount), adjust as needed
      const tx = await contract.stake(amount)
      setStatus('Staking...')
      await tx.wait()
      setStatus('Stake successful!')
    } catch (e) {
      setStatus('Stake failed: ' + (e.reason || e.message))
    }
    setLoading(false)
  }

  // Claim rewards
  const handleClaim = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      const tx = await contract.claimRewards()
      setStatus('Claiming rewards...')
      await tx.wait()
      setStatus('Rewards claimed!')
    } catch (e) {
      setStatus('Claim failed: ' + (e.reason || e.message))
    }
    setLoading(false)
  }

  return (
    <div className="mt-8 p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">StonerFeePool Staking & Rewards</h3>
      <div className="mb-4">
        <input type="text" className="border px-2 py-1 rounded mr-2" placeholder="Amount to stake" value={amount} onChange={e => setAmount(e.target.value)} disabled={loading} />
        <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={handleStake} disabled={loading || !amount}>Stake</button>
      </div>
      <div className="mb-4">
        <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={handleClaim} disabled={loading}>Claim Rewards</button>
      </div>
      {status && <div className="text-blue-700 text-sm">{status}</div>}
    </div>
  )
}
