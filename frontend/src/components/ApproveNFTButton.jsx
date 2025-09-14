import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function ApproveNFTButton({ nftAddress, tokenId, spender, provider, onApproved, disabled }) {
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setApproved(false)
    setError('')
    if (!nftAddress || !tokenId || !spender || !provider) return
    const checkApproval = async () => {
      try {
        const nft = new ethers.Contract(nftAddress, [
          'function getApproved(uint256) view returns (address)',
          'function approve(address,uint256) external',
        ], provider)
        const approvedAddr = await nft.getApproved(tokenId)
        setApproved(approvedAddr.toLowerCase() === spender.toLowerCase())
      } catch (e) {
        setError('Failed to check approval')
      }
    }
    checkApproval()
  }, [nftAddress, tokenId, spender, provider])

  const handleApprove = async () => {
    setApproving(true)
    setError('')
    try {
      if (!window.ethereum) throw new Error('Wallet not found')
      const signer = new ethers.BrowserProvider(window.ethereum).getSigner()
      const nft = new ethers.Contract(nftAddress, [
        'function approve(address,uint256) external',
      ], await signer)
      const tx = await nft.approve(spender, tokenId)
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
