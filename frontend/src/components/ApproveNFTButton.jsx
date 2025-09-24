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
  
  if (approved) {
    return (
      <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium border border-green-200 dark:border-green-700">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Approved
      </div>
    )
  }
  
  return (
    <button
      className="ml-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white rounded-lg text-xs font-medium shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      onClick={handleApprove}
      disabled={approving || disabled}
    >
      {approving ? (
        <>
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          Approving...
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Approve
        </>
      )}
    </button>
  )
}
