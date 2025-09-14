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
  const [selectedTokens, setSelectedTokens] = useState([]) // Changed to array for batch selection
  const [approvedMap, setApprovedMap] = useState({}) // Track individual approvals
  const [isApprovedForAll, setIsApprovedForAll] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)

  const getSigner = async () => {
    if (!window.ethereum) throw new Error('Wallet not found')
    const provider = new ethers.BrowserProvider(window.ethereum)
    return provider.getSigner()
  }

  // Batch Stake NFTs
  const handleStake = async () => {
    setStatus('')
    // Preflight checks for batch staking
    if (selectedTokens.length === 0) {
      setStatus('Select at least one NFT to stake.')
      return
    }
    if (selectedTokens.length > 10) {
      setStatus('You can only stake up to 10 NFTs at once.')
      return
    }
    // Check for duplicates
    const unique = new Set(selectedTokens)
    if (unique.size !== selectedTokens.length) {
      setStatus('Duplicate NFTs selected. Please select each NFT only once.')
      return
    }
    // Check all are approved (either individually or via setApprovalForAll)
    if (!isApprovedForAll && !selectedTokens.every(tid => approvedMap[tid])) {
      setStatus('All selected NFTs must be approved before staking.')
      return
    }
    
    setLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      
      let tx
      if (selectedTokens.length > 1) {
        tx = await contract.stakeMultiple(selectedTokens)
      } else {
        tx = await contract.stake(selectedTokens[0])
      }
      setStatus('Staking...')
      await tx.wait()
      setStatus('Stake successful!')
      setSelectedTokens([]) // Clear selection after successful stake
    } catch (e) {
      setStatus('Stake failed: ' + (e.reason || e.message))
      console.error('Stake error', e)
    }
    setLoading(false)
  }
  // Fetch user's Stoner NFTs and approval for all
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!window.ethereum) return
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const addr = await signer.getAddress()
      try {
        // Use full ABI for custom enumeration
        const nftContract = new ethers.Contract(
          STONER_NFT_ADDRESS,
          StonerNFTABI,
          provider
        )
        // Check isApprovedForAll
        let approvedAll = false
        try {
          approvedAll = await nftContract.isApprovedForAll(addr, STONER_FEE_POOL_ADDRESS)
        } catch {}
        setIsApprovedForAll(!!approvedAll)

        let tokens = []
        let count = 0
        try {
          count = await nftContract.totalNFTsOwned(addr)
        } catch {
          // fallback to balanceOf
          try {
            count = await nftContract.balanceOf(addr)
          } catch {
            count = 0
          }
        }
        count = Number(count)
        let usedFallback = false
        const approvedMapTemp = {}
        for (let i = 0; i < count; i++) {
          let tokenId = null
          try {
            tokenId = await nftContract.tokenOfOwnerByIndex(addr, i)
          } catch (err) {
            // tokenOfOwnerByIndex not supported
            usedFallback = true
            break
          }
          let image = null
          let approved = false
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
            // Check individual approval
            if (approvedAll) {
              approved = true
            } else {
              const approvedAddr = await nftContract.getApproved(tokenId)
              approved = approvedAddr && STONER_FEE_POOL_ADDRESS && approvedAddr.toLowerCase() === STONER_FEE_POOL_ADDRESS.toLowerCase()
            }
          } catch (err) {
            console.warn('Failed to fetch NFT metadata/image', tokenId, err)
          }
          tokens.push({ tokenId: tokenId?.toString(), image })
          approvedMapTemp[tokenId?.toString()] = approved
        }
        // Fallback: scan a range of tokenIds if tokenOfOwnerByIndex is not supported
        if (usedFallback && count > 0) {
          console.warn('tokenOfOwnerByIndex not supported, using fallback scan for Stoner NFTs')
          // Try scanning tokenIds 0..(max 10000)
          let found = 0
          for (let tokenId = 0; tokenId < Math.min(10000, count + 100); tokenId++) {
            try {
              const owner = await nftContract.ownerOf(tokenId)
              if (owner && owner.toLowerCase() === addr.toLowerCase()) {
                let image = null
                let approved = false
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
                  // Check individual approval in fallback
                  if (approvedAll) {
                    approved = true
                  } else {
                    const approvedAddr = await nftContract.getApproved(tokenId)
                    approved = approvedAddr && STONER_FEE_POOL_ADDRESS && approvedAddr.toLowerCase() === STONER_FEE_POOL_ADDRESS.toLowerCase()
                  }
                } catch {}
                tokens.push({ tokenId: tokenId.toString(), image })
                approvedMapTemp[tokenId.toString()] = approved
                found++
                if (found >= count) break
              }
            } catch {}
          }
        }
        setWalletNFTs(tokens)
        setApprovedMap(approvedMapTemp)
      } catch (e) {
        setWalletNFTs([])
        setApprovedMap({})
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
            <div key={nft.tokenId} className="flex flex-col items-center">
              <button 
                className={`border-2 rounded-xl p-1 bg-gradient-to-br from-green-900/20 to-card shadow-sm transition-all ${
                  selectedTokens.includes(nft.tokenId) ? 'border-green-400 scale-105' : 'border-gray-700 hover:border-green-400'
                } text-text`} 
                onClick={() => setSelectedTokens(tokens => 
                  tokens.includes(nft.tokenId) 
                    ? tokens.filter(t => t !== nft.tokenId) 
                    : [...tokens, nft.tokenId]
                )} 
                disabled={loading}
              >
                <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
                <div className="text-xs text-center text-text font-mono">#{nft.tokenId}</div>
              </button>
              {!isApprovedForAll && (
                <StonerApproveButton 
                  tokenId={nft.tokenId} 
                  onApproved={() => setApprovedMap(m => ({ ...m, [nft.tokenId]: true }))} 
                  disabled={loading || approvedMap[nft.tokenId]} 
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center mt-3 gap-3">
          <button 
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-400 text-white rounded-lg shadow font-semibold tracking-wide disabled:opacity-50" 
            onClick={handleStake} 
            disabled={loading || selectedTokens.length === 0 || (!isApprovedForAll && !selectedTokens.every(tid => approvedMap[tid]))}
          >
            Stake Selected ({selectedTokens.length})
          </button>
          {!isApprovedForAll && (
            <button 
              className="px-3 py-2 bg-blue-600 text-white rounded shadow text-xs font-semibold disabled:opacity-50" 
              disabled={approvingAll || loading} 
              onClick={async () => {
                setApprovingAll(true)
                try {
                  if (!window.ethereum) throw new Error('Wallet not found')
                  const signer = await (new ethers.BrowserProvider(window.ethereum)).getSigner()
                  const nft = new ethers.Contract(STONER_NFT_ADDRESS, ["function setApprovalForAll(address,bool) external"], signer)
                  const tx = await nft.setApprovalForAll(STONER_FEE_POOL_ADDRESS, true)
                  await tx.wait()
                  setIsApprovedForAll(true)
                  // Update all approvals to true
                  setApprovedMap(m => {
                    const all = { ...m }
                    walletNFTs.forEach(nft => { all[nft.tokenId] = true })
                    return all
                  })
                } catch (e) {
                  alert(e.reason || e.message)
                }
                setApprovingAll(false)
              }}
            >
              {approvingAll ? 'Approving All...' : 'Approve All'}
            </button>
          )}
          {isApprovedForAll && <span className="text-green-400 font-semibold text-xs ml-2">All Approved</span>}
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
