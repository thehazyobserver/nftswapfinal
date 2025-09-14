import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import StonerFeePoolABI from '../abis/StonerFeePool.json'
import NFTTokenImage from './NFTTokenImage'

// TODO: Replace with your actual StonerFeePool contract address
const STONER_FEE_POOL_ADDRESS = '0xF589111A4Af712142E68ce917751a4BFB8966dEe'
// TODO: Replace with your actual Stoner NFT contract address
const STONER_NFT_ADDRESS = '0xe93755cC3b462E193023cf66c0aE3d3FB2E5b8f4'

export default function StonerFeePoolActions() {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletNFTs, setWalletNFTs] = useState([])
  const [selectedToken, setSelectedToken] = useState(null)

  const getSigner = async () => {
    if (!window.ethereum) throw new Error('Wallet not found')
    const provider = new ethers.BrowserProvider(window.ethereum)
    return provider.getSigner()
  }

  // Stake NFT (by tokenId)
  const handleStake = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      const tx = await contract.stake(selectedToken)
      setStatus('Staking...')
      await tx.wait()
      setStatus('Stake successful!')
    } catch (e) {
      setStatus('Stake failed: ' + (e.reason || e.message))
      console.error('Stake error', e)
    }
    setLoading(false)
  }
  // Fetch user's Stoner NFTs
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!window.ethereum) return
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const addr = await signer.getAddress()
      try {
        const nftContract = new ethers.Contract(
          STONER_NFT_ADDRESS,
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
    }
    fetchNFTs()
  }, [])

  // Claim rewards
  const handleClaim = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      const tx = await contract.claimAllRewards()
      setStatus('Claiming rewards...')
      await tx.wait()
      setStatus('Rewards claimed!')
    } catch (e) {
      setStatus('Claim failed: ' + (e.reason || e.message))
      console.error('Claim error', e)
    }
    setLoading(false)
  }

  return (
    <div className="mt-8 p-4 sm:p-6 bg-secondary dark:bg-secondary rounded-2xl shadow-xl border border-accent/10">
      <h3 className="font-bold text-lg mb-4 text-accent tracking-wide">StonerFeePool Staking & Rewards</h3>
      <div className="mb-6">
        <div className="font-semibold mb-2 text-green-400">Stake Stoner NFT</div>
        <div className="flex gap-3 flex-wrap">
          {walletNFTs.length === 0 && <div className="text-muted italic">No Stoner NFTs in wallet</div>}
          {walletNFTs.map(nft => (
            <button key={nft.tokenId} className={`border-2 rounded-xl p-1 bg-gradient-to-br from-green-900/20 to-card shadow-sm transition-all ${selectedToken === nft.tokenId ? 'border-green-400 scale-105' : 'border-gray-700 hover:border-green-400'} text-text`} onClick={() => setSelectedToken(nft.tokenId)} disabled={loading}>
              <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
              <div className="text-xs text-center text-text font-mono">#{nft.tokenId}</div>
            </button>
          ))}
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-400 text-white rounded-lg shadow mt-3 font-semibold tracking-wide disabled:opacity-50" onClick={handleStake} disabled={loading || !selectedToken}>Stake</button>
      </div>
      <div className="mb-4">
        <div className="font-semibold mb-2 text-yellow-400">Claim Rewards</div>
        <button className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg shadow font-semibold tracking-wide disabled:opacity-50" onClick={handleClaim} disabled={loading}>Claim Rewards</button>
      </div>
      {status && <div className="text-accent text-base font-semibold animate-pulse">{status}</div>}
    </div>
  )
}
