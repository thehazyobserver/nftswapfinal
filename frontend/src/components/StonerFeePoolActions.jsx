import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import StonerFeePoolABI from '../abis/StonerFeePool.json'
import NFTTokenImage from './NFTTokenImage'
import StonerNFTABI from '../abis/StonerNFT.json'

const STONER_FEE_POOL_ADDRESS = '0xF589111A4Af712142E68ce917751a4BFB8966dEe'
const STONER_NFT_ADDRESS = '0x9b567e03d891F537b2B7874aA4A3308Cfe2F4FBb'

export default function StonerFeePoolActions() {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletNFTs, setWalletNFTs] = useState([])
  const [stakedNFTs, setStakedNFTs] = useState([])
  const [selectedTokens, setSelectedTokens] = useState([])
  const [selectedStakedTokens, setSelectedStakedTokens] = useState([])
  const [isApprovedForAll, setIsApprovedForAll] = useState(false)

  const getSigner = async () => {
    if (!window.ethereum) throw new Error('Wallet not found')
    const provider = new ethers.BrowserProvider(window.ethereum)
    return provider.getSigner()
  }

  // Fetch NFTs
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!window.ethereum) return
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        const addr = await signer.getAddress()
        
        const nftContract = new ethers.Contract(STONER_NFT_ADDRESS, StonerNFTABI, provider)
        const feePoolContract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, provider)
        
        // Check approval
        const approvedAll = await nftContract.isApprovedForAll(addr, STONER_FEE_POOL_ADDRESS)
        setIsApprovedForAll(approvedAll)
        
        // Get wallet NFTs
        const balance = await nftContract.balanceOf(addr)
        console.log('🔢 Stoner NFT balance:', balance.toString())
        const walletTokens = []
        
        // Try to get all tokens owned (up to 50 max for performance)
        for (let i = 0; i < Math.min(Number(balance), 50); i++) {
          try {
            const tokenId = await nftContract.tokenOfOwnerByIndex(addr, i)
            console.log(`📝 Found wallet token ${i + 1}/${balance}: #${tokenId.toString()}`)
            let image = null
            
            try {
              let uri = await nftContract.tokenURI(tokenId)
              if (uri.startsWith('ipfs://')) {
                uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              if (uri.startsWith('http')) {
                const resp = await fetch(uri)
                const meta = await resp.json()
                image = meta.image || meta.image_url
                if (image && image.startsWith('ipfs://')) {
                  image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                }
              }
            } catch (e) {
              console.warn('Failed to fetch metadata for token', tokenId.toString())
            }
            
            walletTokens.push({ tokenId: tokenId.toString(), image })
          } catch (e) {
            break
          }
        }
        
        console.log(`✅ Loaded ${walletTokens.length}/${balance} wallet Stoner NFTs`)
        setWalletNFTs(walletTokens)
        
        // Get staked NFTs
        try {
          const stakedTokenIdsRaw = await feePoolContract.getStakedTokens(addr)
          // Convert proxy result to actual array 
          const stakedTokenIds = Array.from(stakedTokenIdsRaw).map(id => id.toString())
          console.log('🔥 Staked Stoner NFT token IDs:', stakedTokenIds)
          const stakedTokens = []
          
          for (const tokenId of stakedTokenIds) {
            let image = null
            try {
              let uri = await nftContract.tokenURI(tokenId)
              if (uri.startsWith('ipfs://')) {
                uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              if (uri.startsWith('http')) {
                const resp = await fetch(uri)
                const meta = await resp.json()
                image = meta.image || meta.image_url
                if (image && image.startsWith('ipfs://')) {
                  image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                }
              }
            } catch (e) {
              console.warn('Failed to fetch metadata for staked token', tokenId.toString())
            }
            
            stakedTokens.push({ tokenId: tokenId.toString(), image })
          }
          
          console.log(`✅ Loaded ${stakedTokens.length} staked Stoner NFTs:`, stakedTokens.map(t => t.tokenId))
          setStakedNFTs(stakedTokens)
        } catch (e) {
          console.warn('Failed to fetch staked NFTs:', e)
        }
        
      } catch (e) {
        console.error('Failed to fetch NFTs:', e)
      }
    }
    
    fetchNFTs()
  }, [])

  // Handle stake
  const handleStake = async () => {
    if (selectedTokens.length === 0) {
      setStatus('Select NFTs to stake first')
      return
    }
    
    setLoading(true)
    setStatus('')
    
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      
      let tx
      if (selectedTokens.length === 1) {
        tx = await contract.stake(selectedTokens[0])
      } else {
        tx = await contract.stakeMultiple(selectedTokens)
      }
      
      setStatus('Staking...')
      await tx.wait()
      setStatus('Staking successful!')
      setSelectedTokens([])
    } catch (e) {
      setStatus('Staking failed: ' + (e.reason || e.message))
    }
    
    setLoading(false)
  }

  // Handle unstake
  const handleUnstake = async () => {
    if (selectedStakedTokens.length === 0) {
      setStatus('Select staked NFTs to unstake first')
      return
    }
    
    setLoading(true)
    setStatus('')
    
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      
      let tx
      if (selectedStakedTokens.length === 1) {
        tx = await contract.unstake(selectedStakedTokens[0])
      } else {
        tx = await contract.unstakeMultiple(selectedStakedTokens)
      }
      
      setStatus('Unstaking...')
      await tx.wait()
      setStatus('Unstaking successful!')
      setSelectedStakedTokens([])
    } catch (e) {
      setStatus('Unstaking failed: ' + (e.reason || e.message))
    }
    
    setLoading(false)
  }

  // Handle claim
  const handleClaim = async () => {
    setLoading(true)
    setStatus('')
    
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      const tx = await contract.claimAllRewards()
      setStatus('Claiming rewards...')
      await tx.wait()
      setStatus('Rewards claimed successfully!')
    } catch (e) {
      setStatus('Claim failed: ' + (e.reason || e.message))
    }
    
    setLoading(false)
  }

  // Handle approval
  const handleApproveAll = async () => {
    setLoading(true)
    
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_NFT_ADDRESS, ['function setApprovalForAll(address,bool) external'], signer)
      const tx = await contract.setApprovalForAll(STONER_FEE_POOL_ADDRESS, true)
      await tx.wait()
      setIsApprovedForAll(true)
      setStatus('Approval successful!')
    } catch (e) {
      setStatus('Approval failed: ' + (e.reason || e.message))
    }
    
    setLoading(false)
  }

  return (
    <div className="p-6 bg-card/60 rounded-2xl shadow-xl border border-accent/10 backdrop-blur-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">🌿</span>
          </div>
          <div>
            <h3 className="font-bold text-xl text-green-400">Stoner NFT Staking</h3>
            <p className="text-sm text-muted">Stake your Stoner NFTs to earn rewards</p>
          </div>
        </div>
        <button 
          onClick={handleClaim}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50 font-medium"
        >
          Claim Rewards
        </button>
      </div>

      {status && (
        <div className={`p-3 rounded-lg ${
          status.includes('successful') || status.includes('claimed') 
            ? 'bg-green-900/20 border border-green-500/20 text-green-400'
            : status.includes('failed') || status.includes('error')
            ? 'bg-red-900/20 border border-red-500/20 text-red-400'
            : 'bg-blue-900/20 border border-blue-500/20 text-blue-400'
        }`}>
          {status}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stake Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-green-400">Stake NFTs ({selectedTokens.length} selected)</h4>
            {!isApprovedForAll && (
              <button
                onClick={handleApproveAll}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
              >
                Approve All
              </button>
            )}
          </div>

          {walletNFTs.length === 0 ? (
            <div className="p-6 bg-card/30 rounded-xl text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-muted">No Stoner NFTs found in wallet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                {walletNFTs.slice(0, 12).map((nft) => (
                  <div
                    key={nft.tokenId}
                    className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                      selectedTokens.includes(nft.tokenId)
                        ? 'border-green-400 bg-green-400/10'
                        : 'border-transparent hover:border-accent/30'
                    }`}
                    onClick={() => {
                      if (selectedTokens.includes(nft.tokenId)) {
                        setSelectedTokens(prev => prev.filter(id => id !== nft.tokenId))
                      } else {
                        setSelectedTokens(prev => [...prev, nft.tokenId])
                      }
                    }}
                  >
                    <div className="aspect-square p-2">
                      <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size="100%" />
                    </div>
                    <div className="text-xs text-center p-1">#{nft.tokenId}</div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleStake}
                disabled={loading || selectedTokens.length === 0 || !isApprovedForAll}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Staking...' : `Stake ${selectedTokens.length} NFT${selectedTokens.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>

        {/* Unstake Section */}
        <div className="space-y-4">
          <h4 className="font-semibold text-blue-400">Unstake NFTs ({selectedStakedTokens.length} selected)</h4>

          {stakedNFTs.length === 0 ? (
            <div className="p-6 bg-card/30 rounded-xl text-center">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-muted">No staked NFTs</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                {stakedNFTs.slice(0, 12).map((nft) => (
                  <div
                    key={nft.tokenId}
                    className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                      selectedStakedTokens.includes(nft.tokenId)
                        ? 'border-blue-400 bg-blue-400/10'
                        : 'border-transparent hover:border-accent/30'
                    }`}
                    onClick={() => {
                      if (selectedStakedTokens.includes(nft.tokenId)) {
                        setSelectedStakedTokens(prev => prev.filter(id => id !== nft.tokenId))
                      } else {
                        setSelectedStakedTokens(prev => [...prev, nft.tokenId])
                      }
                    }}
                  >
                    <div className="aspect-square p-2">
                      <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size="100%" />
                    </div>
                    <div className="text-xs text-center p-1">#{nft.tokenId}</div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleUnstake}
                disabled={loading || selectedStakedTokens.length === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Unstaking...' : `Unstake ${selectedStakedTokens.length} NFT${selectedStakedTokens.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}