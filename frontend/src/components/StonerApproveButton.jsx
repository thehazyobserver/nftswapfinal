import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import StonerFeePoolABI from '../abis/StonerFeePool.json'
import StonerNFTABI from '../abis/StonerNFT.json'
import NFTTokenImage from './NFTTokenImage'

const STONER_FEE_POOL_ADDRESS = '0xF589111A4Af712142E68ce917751a4BFB8966dEe'
const STONER_NFT_ADDRESS = '0x9b567e03d891F537b2B7874aA4A3308Cfe2F4FBb'

export default function StonerApproveButton({ tokenId, onApproved, disabled }) {
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setApproved(false)
    setError('')
    if (!tokenId) return
    const checkApproval = async () => {
      try {
        if (!window.ethereum) return
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        const nft = new ethers.Contract(STONER_NFT_ADDRESS, StonerNFTABI, provider)
        const approvedAddr = await nft.getApproved(tokenId)
        setApproved(approvedAddr.toLowerCase() === STONER_FEE_POOL_ADDRESS.toLowerCase())
      } catch (e) {
        setError('Failed to check approval')
      }
    }
    checkApproval()
  }, [tokenId])

  const handleApprove = async () => {
    setApproving(true)
    setError('')
    try {
      if (!window.ethereum) throw new Error('Wallet not found')
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const nft = new ethers.Contract(STONER_NFT_ADDRESS, StonerNFTABI, signer)
      const tx = await nft.approve(STONER_FEE_POOL_ADDRESS, tokenId)
      await tx.wait()
      setApproved(true)
      if (onApproved) onApproved()
    } catch (e) {
      setError(e.reason || e.message)
    }
    setApproving(false)
  }

  if (!tokenId) return null
  if (approved) return <span className="text-green-400 font-semibold text-xs ml-2">Approved</span>
  return (
    <button
      className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold disabled:opacity-50"
      onClick={handleApprove}
      disabled={approving || disabled}
    >
      {approving ? 'Approving...' : 'Approve'}
    </button>
  )
}
