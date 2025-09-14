import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import StonerFeePoolABI from '../abis/StonerFeePool.json'
import NFTTokenImage from './NFTTokenImage'
import StonerNFTABI from '../abis/StonerNFT.json'
import StonerApproveButton from './StonerApproveButton'

// TODO: Replace with your actual StonerFeePool contract address
const STONER_FEE_POOL_ADDRESS = '0xF589111A4Af712142E68ce917751a4BFB8966dEe'
// TODO: Replace with your actual Stoner NFT contract address
const STONER_NFT_ADDRESS = '0x9b567e03d891F537b2B7874aA4A3308Cfe2F4FBb'

export default function StonerFeePoolActions() {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletNFTs, setWalletNFTs] = useState([])
  const [selectedToken, setSelectedToken] = useState(null)
  const [isApproved, setIsApproved] = useState(false)

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
      // Check approval before staking
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const nft = new ethers.Contract(STONER_NFT_ADDRESS, StonerNFTABI, provider)
      const approvedAddr = await nft.getApproved(selectedToken)
      if (approvedAddr.toLowerCase() !== STONER_FEE_POOL_ADDRESS.toLowerCase()) {
        setStatus('Please approve this NFT before staking.')
        setLoading(false)
        return
      }
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
        let usedFallback = false
        for (let i = 0; i < Number(balance); i++) {
          let tokenId = null
          try {
            tokenId = await nftContract.tokenOfOwnerByIndex(addr, i)
          } catch (err) {
            // tokenOfOwnerByIndex not supported
            usedFallback = true
            break
          }
          let image = null
          try {
            let uri = await nftContract.tokenURI(tokenId)
            if (uri.startsWith('ipfs://')) {
              uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
            }
            if (uri.startsWith('http')) {
              const resp = await fetch(uri)
              const meta = await resp.json()
              image = meta.image || meta.image_url || (meta.properties && meta.properties.image) || null
              if (image && image.startsWith('ipfs://')) {
                image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              if (!image) {
                console.warn('No image field in metadata', meta, uri)
              }
            } else {
              console.warn('tokenURI is not http(s):', uri)
            }
          } catch (err) {
            console.warn('Failed to fetch NFT metadata/image', tokenId, err)
          }
          tokens.push({ tokenId: tokenId?.toString(), image })
        }
        // Fallback: scan a range of tokenIds if tokenOfOwnerByIndex is not supported
        if (usedFallback && Number(balance) > 0) {
          console.warn('tokenOfOwnerByIndex not supported, using fallback scan for Stoner NFTs')
          // Try scanning tokenIds 0..(max 10000)
          for (let tokenId = 0; tokenId < Math.min(10000, Number(balance) + 100); tokenId++) {
            try {
              const owner = await nftContract.ownerOf(tokenId)
              if (owner && owner.toLowerCase() === addr.toLowerCase()) {
                let image = null
                try {
                  let uri = await nftContract.tokenURI(tokenId)
                  if (uri.startsWith('ipfs://')) {
                    uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
                  }
                  if (uri.startsWith('http')) {
                    const resp = await fetch(uri)
                    const meta = await resp.json()
                    image = meta.image || meta.image_url || (meta.properties && meta.properties.image) || null
                    if (image && image.startsWith('ipfs://')) {
                      image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                    }
                  }
                } catch {}
                tokens.push({ tokenId: tokenId.toString(), image })
              }
            } catch {}
          }
        }
        setWalletNFTs(tokens)
      } catch (e) {
        setWalletNFTs([])
      }
    }
    fetchNFTs()
  }, [])

  // Check approval for selected token
  useEffect(() => {
    if (!selectedToken) {
      setIsApproved(false)
      return
    }
    const checkApproval = async () => {
      try {
        if (!window.ethereum) return
        const provider = new ethers.BrowserProvider(window.ethereum)
        const nft = new ethers.Contract(STONER_NFT_ADDRESS, StonerNFTABI, provider)
        const approvedAddr = await nft.getApproved(selectedToken)
        setIsApproved(approvedAddr.toLowerCase() === STONER_FEE_POOL_ADDRESS.toLowerCase())
      } catch {
        setIsApproved(false)
      }
    }
    checkApproval()
  }, [selectedToken, loading])

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
        <div className="flex items-center mt-3">
          <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-400 text-white rounded-lg shadow font-semibold tracking-wide disabled:opacity-50" onClick={handleStake} disabled={loading || !selectedToken || !isApproved}>Stake</button>
          {selectedToken && <StonerApproveButton tokenId={selectedToken} onApproved={() => setIsApproved(true)} disabled={loading || isApproved} />}
        </div>
      </div>
      <div className="mb-4">
        <div className="font-semibold mb-2 text-yellow-400">Claim Rewards</div>
        <button className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg shadow font-semibold tracking-wide disabled:opacity-50" onClick={handleClaim} disabled={loading}>Claim Rewards</button>
      </div>
      {status && <div className="text-accent text-base font-semibold animate-pulse">{status}</div>}
    </div>
  )
}
