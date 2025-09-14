import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import SwapPoolABI from '../abis/SwapPool.json'
import StakeReceiptABI from '../abis/StakeReceipt.json'
import NFTTokenImage from './NFTTokenImage'
import ApproveNFTButton from './ApproveNFTButton'

export default function PoolActions({ swapPool, stakeReceipt, provider: externalProvider }) {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletNFTs, setWalletNFTs] = useState([])
  const [approvedMap, setApprovedMap] = useState({}) // tokenId -> bool
  const [nftCollection, setNftCollection] = useState(null)
  const [isApprovedForAll, setIsApprovedForAll] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)
  const [stakedNFTs, setStakedNFTs] = useState([])
  const [receiptNFTs, setReceiptNFTs] = useState([])
  const [selectedWalletTokens, setSelectedWalletTokens] = useState([])
  const [selectedReceiptTokens, setSelectedReceiptTokens] = useState([])
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
      // Use externalProvider for read-only, fallback to window.ethereum if not provided
      const provider = externalProvider || (window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null)
      if (!provider) return
      let addr = null
      if (window.ethereum) {
        try {
          const signer = await provider.getSigner()
          addr = await signer.getAddress()
        } catch {}
      }
      setAddress(addr)
      // Fetch wallet NFTs (ERC721)
      let collectionAddr = null
      try {
        collectionAddr = await (new ethers.Contract(swapPool, SwapPoolABI, provider)).nftCollection()
        setNftCollection(collectionAddr)
        const nftContract = new ethers.Contract(
          collectionAddr,
          [
            "function balanceOf(address) view returns (uint256)",
            "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
            "function tokenURI(uint256) view returns (string)",
            "function getApproved(uint256) view returns (address)",
            "function isApprovedForAll(address,address) view returns (bool)"
          ],
          provider
        )
        if (addr) {
          const balance = await nftContract.balanceOf(addr)
          const tokens = []
          // Check isApprovedForAll
          let approvedAll = false
          try {
            approvedAll = await nftContract.isApprovedForAll(addr, swapPool)
          } catch {}
          setIsApprovedForAll(!!approvedAll)

          const approvedMapTemp = {}
          for (let i = 0; i < Number(balance); i++) {
            const tokenId = await nftContract.tokenOfOwnerByIndex(addr, i)
            let image = null
            let approved = false
            try {
              let uri = await nftContract.tokenURI(tokenId)
              // Handle ipfs:// URIs
              if (uri.startsWith('ipfs://')) {
                uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              // Try to fetch image from metadata
              if (uri.startsWith('http')) {
                const resp = await fetch(uri)
                const meta = await resp.json()
                image = meta.image || meta.image_url || (meta.properties && meta.properties.image) || null
                // Handle ipfs:// in image field
                if (image && image.startsWith('ipfs://')) {
                  image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                }
                if (!image) {
                  console.warn('No image field in metadata', meta, uri)
                }
              } else {
                console.warn('tokenURI is not http(s):', uri)
              }
              // Check approval
              if (approvedAll) {
                approved = true
              } else {
                const approvedAddr = await nftContract.getApproved(tokenId)
                approved = approvedAddr && swapPool && approvedAddr.toLowerCase() === swapPool.toLowerCase()
              }
            } catch (err) {
              console.warn('Failed to fetch NFT metadata/image/approval', tokenId, err)
            }
            tokens.push({ tokenId: tokenId.toString(), image })
            approvedMapTemp[tokenId.toString()] = approved
          }
          setWalletNFTs(tokens)
          setApprovedMap(approvedMapTemp)
        }
      } catch (e) {
        setWalletNFTs([])
      }
      // Fetch staked NFTs (getUserStakes)
      try {
        const pool = new ethers.Contract(swapPool, SwapPoolABI, provider)
        if (addr) {
          const staked = await pool.getUserStakes(addr)
          setStakedNFTs(staked.map(t => t.toString()))
        }
      } catch (e) {
        setStakedNFTs([])
      }
      // Fetch receipt tokens (ERC721)
      try {
        const receipt = new ethers.Contract(stakeReceipt, ["function balanceOf(address) view returns (uint256)", "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)", "function tokenURI(uint256) view returns (string)"], provider)
        if (addr) {
          const balance = await receipt.balanceOf(addr)
          const tokens = []
          for (let i = 0; i < Number(balance); i++) {
            const tokenId = await receipt.tokenOfOwnerByIndex(addr, i)
            let image = null
            try {
              let uri = await receipt.tokenURI(tokenId)
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
              console.warn('Failed to fetch receipt NFT metadata/image', tokenId, err)
            }
            tokens.push({ tokenId: tokenId.toString(), image })
          }
          setReceiptNFTs(tokens)
        }
      } catch (e) {
        setReceiptNFTs([])
      }
    }
    fetchNFTs()
    // eslint-disable-next-line
  }, [swapPool, stakeReceipt])

  // Batch Stake
  const handleStake = async () => {
    setStatus('')
    // Preflight checks for batch staking
    if (selectedWalletTokens.length === 0) {
      setStatus('Select at least one NFT to stake.')
      return
    }
    if (selectedWalletTokens.length > 10) {
      setStatus('You can only stake up to 10 NFTs at once.')
      return
    }
    // Check for duplicates
    const unique = new Set(selectedWalletTokens)
    if (unique.size !== selectedWalletTokens.length) {
      setStatus('Duplicate NFTs selected. Please select each NFT only once.')
      return
    }
    // Check all are approved
    if (!isApprovedForAll && !selectedWalletTokens.every(tid => approvedMap[tid])) {
      setStatus('All selected NFTs must be approved before staking.')
      return
    }
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      
      // Add debug logging
      console.log('Attempting to stake:', selectedWalletTokens.length, 'NFTs')
      console.log('Token IDs:', selectedWalletTokens)
      console.log('Contract has stakeNFTBatch:', typeof contract.stakeNFTBatch === 'function')
      
      let tx
      if (selectedWalletTokens.length > 1) {
        // Always use batch function for multiple tokens
        tx = await contract.stakeNFTBatch(selectedWalletTokens)
      } else {
        tx = await contract.stakeNFT(selectedWalletTokens[0])
      }
      setStatus('Staking...')
      await tx.wait()
      setStatus('Stake successful!')
      setSelectedWalletTokens([]) // Clear selection after successful stake
    } catch (e) {
      setStatus('Stake failed: ' + (e.reason || e.message))
      console.error('Detailed stake error:', e)
    }
    setLoading(false)
  }

  // Batch Unstake
  const handleUnstake = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      let tx
      if (selectedReceiptTokens.length > 1 && contract.unstakeNFTBatch) {
        tx = await contract.unstakeNFTBatch(selectedReceiptTokens)
      } else {
        tx = await contract.unstakeNFT(selectedReceiptTokens[0])
      }
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
    <div className="mt-6 p-4 sm:p-6 bg-secondary dark:bg-secondary rounded-2xl shadow-xl border border-accent/10">
      <h4 className="font-bold text-lg mb-4 text-accent tracking-wide">Pool Actions</h4>
      <div className="space-y-6">
        <div>
          <div className="font-semibold mb-2 text-green-400">Stake NFT(s)</div>
          <div className="flex gap-3 flex-wrap">
            {walletNFTs.length === 0 && <div className="text-muted italic">No NFTs in wallet</div>}
            {walletNFTs.map(nft => (
              <div key={nft.tokenId} className="flex flex-col items-center">
                <button className={`border-2 rounded-xl p-1 bg-gradient-to-br from-green-900/20 to-card shadow-sm transition-all ${selectedWalletTokens.includes(nft.tokenId) ? 'border-green-400 scale-105' : 'border-gray-700 hover:border-green-400'} text-text`} onClick={() => setSelectedWalletTokens(tokens => tokens.includes(nft.tokenId) ? tokens.filter(t => t !== nft.tokenId) : [...tokens, nft.tokenId])} disabled={loading}>
                  <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
                  <div className="text-xs text-center text-text font-mono">#{nft.tokenId}</div>
                </button>
                {nftCollection && swapPool && !isApprovedForAll && (
                  <ApproveNFTButton
                    nftAddress={nftCollection}
                    tokenId={nft.tokenId}
                    spender={swapPool}
                    provider={externalProvider}
                    disabled={loading || approvedMap[nft.tokenId]}
                    onApproved={() => setApprovedMap(m => ({ ...m, [nft.tokenId]: true }))}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-400 text-white rounded-lg shadow font-semibold tracking-wide disabled:opacity-50" onClick={handleStake} disabled={loading || selectedWalletTokens.length === 0 || !selectedWalletTokens.every(tid => approvedMap[tid] || isApprovedForAll)}>Stake Selected</button>
            {nftCollection && swapPool && !isApprovedForAll && (
              <button className="px-3 py-2 bg-blue-600 text-white rounded shadow text-xs font-semibold disabled:opacity-50" disabled={approvingAll || loading} onClick={async () => {
                setApprovingAll(true)
                try {
                  if (!window.ethereum) throw new Error('Wallet not found')
                  const signer = await (new ethers.BrowserProvider(window.ethereum)).getSigner()
                  const nft = new ethers.Contract(nftCollection, ["function setApprovalForAll(address,bool) external"], signer)
                  const tx = await nft.setApprovalForAll(swapPool, true)
                  await tx.wait()
                  setIsApprovedForAll(true)
                  setApprovedMap(m => {
                    const all = { ...m }
                    walletNFTs.forEach(nft => { all[nft.tokenId] = true })
                    return all
                  })
                } catch (e) {
                  alert(e.reason || e.message)
                }
                setApprovingAll(false)
              }}>
                {approvingAll ? 'Approving All...' : 'Approve All'}
              </button>
            )}
            {isApprovedForAll && <span className="text-green-400 font-semibold text-xs ml-2">All Approved</span>}
          </div>
        </div>
        <div>
          <div className="font-semibold mb-2 text-red-400">Unstake NFT(s)</div>
          <div className="flex gap-3 flex-wrap">
            {receiptNFTs.length === 0 && <div className="text-muted italic">No receipt tokens</div>}
            {receiptNFTs.map(nft => (
              <button key={nft.tokenId} className={`border-2 rounded-xl p-1 bg-gradient-to-br from-red-900/20 to-card shadow-sm transition-all ${selectedReceiptTokens.includes(nft.tokenId) ? 'border-red-400 scale-105' : 'border-gray-700 hover:border-red-400'} text-text`} onClick={() => setSelectedReceiptTokens(tokens => tokens.includes(nft.tokenId) ? tokens.filter(t => t !== nft.tokenId) : [...tokens, nft.tokenId])} disabled={loading}>
                <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
                <div className="text-xs text-center text-text font-mono">#{nft.tokenId}</div>
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-400 text-white rounded-lg shadow mt-3 font-semibold tracking-wide disabled:opacity-50" onClick={handleUnstake} disabled={loading || selectedReceiptTokens.length === 0}>Unstake Selected</button>
        </div>
        <div>
          <div className="font-semibold mb-2 text-yellow-400">Claim Rewards</div>
          <button className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg shadow font-semibold tracking-wide disabled:opacity-50" onClick={handleClaim} disabled={loading}>Claim</button>
        </div>
        <div>
          <div className="font-semibold mb-2 text-indigo-400">Swap NFT</div>
          <div className="flex gap-3 flex-wrap">
            {walletNFTs.length === 0 && <div className="text-muted italic">No NFTs in wallet</div>}
            {walletNFTs.map(nft => (
              <button key={nft.tokenId} className={`border-2 rounded-xl p-1 bg-gradient-to-br from-indigo-900/20 to-card shadow-sm transition-all ${selectedSwapToken === nft.tokenId ? 'border-indigo-400 scale-105' : 'border-gray-700 hover:border-indigo-400'} text-text`} onClick={() => setSelectedSwapToken(nft.tokenId)} disabled={loading}>
                <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
                <div className="text-xs text-center text-text font-mono">#{nft.tokenId}</div>
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg shadow mt-3 font-semibold tracking-wide disabled:opacity-50" onClick={handleSwap} disabled={loading || !selectedSwapToken}>Swap</button>
        </div>
  {status && <div className="mt-4 text-base text-accent font-semibold animate-pulse">{status}</div>}
      </div>
    </div>
  )
}
