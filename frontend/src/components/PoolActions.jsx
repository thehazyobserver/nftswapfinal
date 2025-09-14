import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import SwapPoolABI from '../abis/SwapPool.json'
import StakeReceiptABI from '../abis/StakeReceipt.json'
import NFTTokenImage from './NFTTokenImage'

export default function PoolActions({ swapPool, stakeReceipt }) {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletNFTs, setWalletNFTs] = useState([])
  const [stakedNFTs, setStakedNFTs] = useState([])
  const [receiptNFTs, setReceiptNFTs] = useState([])
  const [selectedWalletToken, setSelectedWalletToken] = useState(null)
  const [selectedReceiptToken, setSelectedReceiptToken] = useState(null)
  const [selectedSwapToken, setSelectedSwapToken] = useState(null)
  const [address, setAddress] = useState(null)

  // Helper to get signer
  const getSigner = async () => {
    if (!window.ethereum) throw new Error('Wallet not found')
    const provider = new ethers.BrowserProvider(window.ethereum)
    return provider.getSigner()
  }

  // Fetch user's NFTs and staked/receipt tokens
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!window.ethereum) return
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const addr = await signer.getAddress()
      setAddress(addr)
      // Fetch wallet NFTs (ERC721)
      try {
        const nftContract = new ethers.Contract(
          (await (new ethers.Contract(swapPool, SwapPoolABI, provider)).nftCollection()),
          ["function balanceOf(address) view returns (uint256)", "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)", "function tokenURI(uint256) view returns (string)"],
          provider
        )
        const balance = await nftContract.balanceOf(addr)
        const tokens = []
        for (let i = 0; i < Number(balance); i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(addr, i)
          let image = null
          try {
            const uri = await nftContract.tokenURI(tokenId)
            // Try to fetch image from metadata
            if (uri.startsWith('http')) {
              const resp = await fetch(uri)
              const meta = await resp.json()
              image = meta.image || null
            }
          } catch {}
          tokens.push({ tokenId: tokenId.toString(), image })
        }
        setWalletNFTs(tokens)
      } catch (e) {
        setWalletNFTs([])
      }
      // Fetch staked NFTs (getUserStakes)
      try {
        const pool = new ethers.Contract(swapPool, SwapPoolABI, provider)
        const staked = await pool.getUserStakes(addr)
        setStakedNFTs(staked.map(t => t.toString()))
      } catch (e) {
        setStakedNFTs([])
      }
      // Fetch receipt tokens (ERC721)
      try {
        const receipt = new ethers.Contract(stakeReceipt, ["function balanceOf(address) view returns (uint256)", "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)", "function tokenURI(uint256) view returns (string)"], provider)
        const balance = await receipt.balanceOf(addr)
        const tokens = []
        for (let i = 0; i < Number(balance); i++) {
          const tokenId = await receipt.tokenOfOwnerByIndex(addr, i)
          let image = null
          try {
            const uri = await receipt.tokenURI(tokenId)
            if (uri.startsWith('http')) {
              const resp = await fetch(uri)
              const meta = await resp.json()
              image = meta.image || null
            }
          } catch {}
          tokens.push({ tokenId: tokenId.toString(), image })
        }
        setReceiptNFTs(tokens)
      } catch (e) {
        setReceiptNFTs([])
      }
    }
    fetchNFTs()
    // eslint-disable-next-line
  }, [swapPool, stakeReceipt])

  // Stake NFT
  const handleStake = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      const tx = await contract.stakeNFT(selectedWalletToken)
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
      const tx = await contract.unstakeNFT(selectedReceiptToken)
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
  const handleSwap = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      // Get swap fee
      const fee = await contract.swapFeeInWei()
      const tx = await contract.swapNFT(selectedSwapToken, { value: fee })
      setStatus('Swapping...')
      await tx.wait()
      setStatus('Swap successful!')
    } catch (e) {
      setStatus('Swap failed: ' + (e.reason || e.message))
    }
    setLoading(false)
  }

  return (
    <div className="mt-6 p-6 bg-white rounded-2xl shadow-xl border border-indigo-50">
      <h4 className="font-bold text-lg mb-4 text-indigo-700 tracking-wide">Pool Actions</h4>
      <div className="space-y-6">
        <div>
          <div className="font-semibold mb-2 text-green-700">Stake NFT</div>
          <div className="flex gap-3 flex-wrap">
            {walletNFTs.length === 0 && <div className="text-gray-400 italic">No NFTs in wallet</div>}
            {walletNFTs.map(nft => (
              <button key={nft.tokenId} className={`border-2 rounded-xl p-1 bg-gradient-to-br from-green-50 to-white shadow-sm transition-all ${selectedWalletToken === nft.tokenId ? 'border-green-500 scale-105' : 'border-gray-200 hover:border-green-300'}`} onClick={() => setSelectedWalletToken(nft.tokenId)} disabled={loading}>
                <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
                <div className="text-xs text-center text-gray-700 font-mono">#{nft.tokenId}</div>
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-400 text-white rounded-lg shadow mt-3 font-semibold tracking-wide disabled:opacity-50" onClick={handleStake} disabled={loading || !selectedWalletToken}>Stake</button>
        </div>
        <div>
          <div className="font-semibold mb-2 text-red-700">Unstake NFT</div>
          <div className="flex gap-3 flex-wrap">
            {receiptNFTs.length === 0 && <div className="text-gray-400 italic">No receipt tokens</div>}
            {receiptNFTs.map(nft => (
              <button key={nft.tokenId} className={`border-2 rounded-xl p-1 bg-gradient-to-br from-red-50 to-white shadow-sm transition-all ${selectedReceiptToken === nft.tokenId ? 'border-red-500 scale-105' : 'border-gray-200 hover:border-red-300'}`} onClick={() => setSelectedReceiptToken(nft.tokenId)} disabled={loading}>
                <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
                <div className="text-xs text-center text-gray-700 font-mono">#{nft.tokenId}</div>
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-400 text-white rounded-lg shadow mt-3 font-semibold tracking-wide disabled:opacity-50" onClick={handleUnstake} disabled={loading || !selectedReceiptToken}>Unstake</button>
        </div>
        <div>
          <div className="font-semibold mb-2 text-yellow-700">Claim Rewards</div>
          <button className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg shadow font-semibold tracking-wide disabled:opacity-50" onClick={handleClaim} disabled={loading}>Claim</button>
        </div>
        <div>
          <div className="font-semibold mb-2 text-indigo-700">Swap NFT</div>
          <div className="flex gap-3 flex-wrap">
            {walletNFTs.length === 0 && <div className="text-gray-400 italic">No NFTs in wallet</div>}
            {walletNFTs.map(nft => (
              <button key={nft.tokenId} className={`border-2 rounded-xl p-1 bg-gradient-to-br from-indigo-50 to-white shadow-sm transition-all ${selectedSwapToken === nft.tokenId ? 'border-indigo-500 scale-105' : 'border-gray-200 hover:border-indigo-300'}`} onClick={() => setSelectedSwapToken(nft.tokenId)} disabled={loading}>
                <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
                <div className="text-xs text-center text-gray-700 font-mono">#{nft.tokenId}</div>
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg shadow mt-3 font-semibold tracking-wide disabled:opacity-50" onClick={handleSwap} disabled={loading || !selectedSwapToken}>Swap</button>
        </div>
  {status && <div className="mt-4 text-base text-blue-700 font-semibold animate-pulse">{status}</div>}
      </div>
    </div>
  )
}
