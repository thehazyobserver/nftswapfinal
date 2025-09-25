import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import SwapPoolABI from '../abis/SwapPool.json'
import StakeReceiptABI from '../abis/StakeReceipt.json'
import SwapInterface from './SwapInterface'
import StakingInterface from './StakingInterface'

export default function PoolActionsNew({ swapPool, stakeReceipt, provider: externalProvider }) {
  const [activeInterface, setActiveInterface] = useState(null) // null, 'swap', 'stake'
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletNFTs, setWalletNFTs] = useState([])
  const [approvedMap, setApprovedMap] = useState({})
  const [nftCollection, setNftCollection] = useState(null)
  const [isApprovedForAll, setIsApprovedForAll] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)
  const [stakedNFTs, setStakedNFTs] = useState([])
  const [receiptNFTs, setReceiptNFTs] = useState([])
  const [poolNFTs, setPoolNFTs] = useState([])
  const [address, setAddress] = useState(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [poolLoading, setPoolLoading] = useState(false)
  const [contractInfo, setContractInfo] = useState(null)
  const [pendingRewards, setPendingRewards] = useState('0')

  // All the existing functions from PoolActions would be imported here
  // For brevity, I'll show the key ones

  const getSigner = async () => {
    if (!window.ethereum) throw new Error('Wallet not found')
    const provider = new ethers.BrowserProvider(window.ethereum)
    return provider.getSigner()
  }

  const handleSwap = async (selectedTokens) => {
    setLoading(true)
    setStatus('Swapping NFTs...')
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      const tx = await contract.swapNFTs(selectedTokens)
      await tx.wait()
      setStatus('Swap successful! ✅')
      // Refresh data
      await refreshNFTs()
    } catch (error) {
      setStatus(`Swap failed: ${error.reason || error.message}`)
    }
    setLoading(false)
  }

  const handleStake = async (selectedTokens) => {
    setLoading(true)
    setStatus('Staking NFTs...')
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      const tx = await contract.stakeNFTs(selectedTokens)
      await tx.wait()
      setStatus('Stake successful! ✅')
      // Refresh data
      await refreshNFTs()
    } catch (error) {
      setStatus(`Stake failed: ${error.reason || error.message}`)
    }
    setLoading(false)
  }

  const handleUnstake = async (selectedTokens) => {
    setLoading(true)
    setStatus('Unstaking NFTs...')
    try {
      const signer = await getSigner()
      const receiptContract = new ethers.Contract(stakeReceipt, StakeReceiptABI, signer)
      const tx = await receiptContract.unstakeNFTs(selectedTokens)
      await tx.wait()
      setStatus('Unstake successful! ✅')
      // Refresh data
      await refreshNFTs()
    } catch (error) {
      setStatus(`Unstake failed: ${error.reason || error.message}`)
    }
    setLoading(false)
  }

  const handleClaimRewards = async () => {
    setLoading(true)
    setStatus('Claiming rewards...')
    try {
      const signer = await getSigner()
      const receiptContract = new ethers.Contract(stakeReceipt, StakeReceiptABI, signer)
      const tx = await receiptContract.claimRewards()
      await tx.wait()
      setStatus('Rewards claimed successfully! ✅')
      // Refresh data
      await refreshNFTs()
    } catch (error) {
      setStatus(`Claim failed: ${error.reason || error.message}`)
    }
    setLoading(false)
  }

  const handleApproveAll = async () => {
    setApprovingAll(true)
    try {
      const signer = await getSigner()
      const nft = new ethers.Contract(nftCollection, [
        'function setApprovalForAll(address,bool) external'
      ], signer)
      const tx = await nft.setApprovalForAll(swapPool, true)
      await tx.wait()
      setIsApprovedForAll(true)
      setStatus('Approval successful! You can now stake NFTs.')
    } catch (error) {
      setStatus(`Approval failed: ${error.reason || error.message}`)
    }
    setApprovingAll(false)
  }

  // Complete NFT fetching logic
  const refreshNFTs = async () => {
    console.log('Refreshing NFT data...')
    setWalletLoading(true)
    setReceiptLoading(true)
    setPoolLoading(true)
    
    // Clear existing data
    setWalletNFTs([])
    setReceiptNFTs([])
    setPoolNFTs([])
    setAddress(null)
    
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Re-fetch everything
    const provider = externalProvider || (window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null)
    if (!provider) {
      console.warn('No provider available for NFT fetching')
      setWalletLoading(false)
      setReceiptLoading(false)
      setPoolLoading(false)
      return
    }
    
    let addr = null
    if (window.ethereum) {
      try {
        // Check if there are accounts available first
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts && accounts.length > 0) {
          const signer = await provider.getSigner()
          addr = await signer.getAddress()
        }
      } catch (e) {
        console.warn('Could not get signer:', e)
      }
    }
    setAddress(addr)
    
    // If no address, clear wallet-specific data but still fetch pool NFTs
    if (!addr) {
      setWalletNFTs([])
      setWalletLoading(false)
      setReceiptNFTs([])
      setReceiptLoading(false)
      setStakedNFTs([])
      
      // Still fetch pool NFTs even without wallet
      await fetchPoolNFTs(provider)
      return
    }

    // Fetch all NFT data in parallel
    await Promise.all([
      fetchWalletNFTs(addr, provider),
      fetchReceiptNFTs(addr, provider),
      fetchPoolNFTs(provider),
      fetchStakedNFTs(addr, provider)
    ])
    
    // Fetch rewards when refreshing
    await fetchPendingRewards()
  }

  const fetchWalletNFTs = async (addr, provider) => {
    try {
      // Get collection address from pool
      const poolContract = new ethers.Contract(swapPool, SwapPoolABI, provider)
      const collectionAddr = await poolContract.nftCollection()
      setNftCollection(collectionAddr)
      
      if (!collectionAddr) {
        console.log('❌ Could not get NFT collection address from SwapPool')
        setWalletNFTs([])
        setWalletLoading(false)
        return
      }
      
      const nftContract = new ethers.Contract(
        collectionAddr,
        [
          "function balanceOf(address) view returns (uint256)",
          "function ownerOf(uint256) view returns (address)",
          "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
          "function tokenURI(uint256) view returns (string)",
          "function getApproved(uint256) view returns (address)",
          "function isApprovedForAll(address,address) view returns (bool)",
          "function totalSupply() view returns (uint256)"
        ],
        provider
      )
      
      const balance = await nftContract.balanceOf(addr)
      const balanceNumber = Number(balance)
      console.log(`🎯 Collection NFT Balance for ${addr}: ${balanceNumber}`)
      
      if (balanceNumber === 0) {
        console.log(`📭 No NFTs owned by user (balance=0)`)
        setWalletNFTs([])
        setApprovedMap({})
        setWalletLoading(false)
        return
      }
      
      // Check isApprovedForAll
      let approvedAll = false
      try {
        approvedAll = await nftContract.isApprovedForAll(addr, swapPool)
      } catch {}
      setIsApprovedForAll(!!approvedAll)

      let tokenIds = []
      
      // Try enumerable approach first
      if (balanceNumber > 0 && balanceNumber <= 1000) {
        try {
          console.log(`🔍 Trying enumerable approach for ${balance.toString()} tokens...`)
          const tokenIdPromises = []
          for (let i = 0; i < balanceNumber; i++) {
            tokenIdPromises.push(nftContract.tokenOfOwnerByIndex(addr, i))
          }
          tokenIds = await Promise.all(tokenIdPromises)
          console.log(`✅ Enumerable approach successful, found tokens:`, tokenIds.map(id => id.toString()))
        } catch (enumerableError) {
          console.log(`❌ tokenOfOwnerByIndex not supported, using fallback scan`)
          tokenIds = []
        }
      }
      
      // Fallback: Direct ownership scan if enumerable failed
      if (tokenIds.length === 0) {
        console.log('🎯 Starting direct ownership scan...')
        
        let maxTokenId = 2000
        try {
          const totalSupply = await nftContract.totalSupply()
          maxTokenId = Math.min(Number(totalSupply) + 100, 2000)
          console.log(`📈 Total supply: ${totalSupply.toString()}, scanning up to token ${maxTokenId}`)
        } catch {
          console.log(`📈 Total supply not available, scanning up to token ${maxTokenId}`)
        }

        const receivedTokens = new Set()
        const batchSize = 20
        let foundCount = 0
        const targetCount = Number(balanceNumber)
        
        for (let start = 1; start <= maxTokenId && foundCount < targetCount; start += batchSize) {
          const end = Math.min(start + batchSize - 1, maxTokenId)
          
          const ownershipPromises = []
          for (let tokenId = start; tokenId <= end; tokenId++) {
            ownershipPromises.push(
              nftContract.ownerOf(tokenId)
                .then(owner => ({ tokenId, owner: owner.toLowerCase() }))
                .catch(() => ({ tokenId, owner: null }))
            )
          }
          
          try {
            const results = await Promise.all(ownershipPromises)
            
            for (const { tokenId, owner } of results) {
              if (owner === addr.toLowerCase()) {
                receivedTokens.add(tokenId.toString())
                foundCount++
                console.log(`✅ Found owned token: #${tokenId} (${foundCount}/${targetCount})`)
                
                if (foundCount >= targetCount) break
              }
            }
          } catch (e) {
            console.warn(`Batch ${start}-${end} failed:`, e.message)
          }
          
          if (foundCount >= targetCount) break
          await new Promise(resolve => setTimeout(resolve, 50))
        }
        
        tokenIds = Array.from(receivedTokens).map(id => BigInt(id))
        console.log(`✅ Direct ownership scan complete, found ${tokenIds.length} tokens`)
      }
      
      // Convert to NFT objects with metadata
      const nftPromises = tokenIds.map(async (tokenId) => {
        try {
          const tokenIdStr = tokenId.toString()
          let tokenURI = ''
          try {
            tokenURI = await nftContract.tokenURI(tokenId)
          } catch {}
          
          // Check individual approval
          let approved = false
          try {
            const approvedAddr = await nftContract.getApproved(tokenId)
            approved = approvedAddr.toLowerCase() === swapPool.toLowerCase()
          } catch {}
          
          return {
            tokenId: tokenIdStr,
            image: tokenURI,
            approved
          }
        } catch (error) {
          console.warn(`Failed to fetch metadata for token ${tokenId}:`, error)
          return {
            tokenId: tokenId.toString(),
            image: '',
            approved: false
          }
        }
      })
      
      const nfts = await Promise.all(nftPromises)
      console.log(`📦 Wallet NFTs loaded:`, nfts.length)
      
      // Create approval map
      const newApprovedMap = {}
      nfts.forEach(nft => {
        newApprovedMap[nft.tokenId] = nft.approved
      })
      
      setWalletNFTs(nfts)
      setApprovedMap(newApprovedMap)
      
    } catch (error) {
      console.error('Failed to fetch wallet NFTs:', error)
      setWalletNFTs([])
      setApprovedMap({})
    } finally {
      setWalletLoading(false)
    }
  }

  const fetchReceiptNFTs = async (addr, provider) => {
    try {
      const receiptContract = new ethers.Contract(stakeReceipt, [
        "function balanceOf(address) view returns (uint256)", 
        "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)", 
        "function tokenURI(uint256) view returns (string)",
        "function receiptToOriginalToken(uint256) view returns (uint256)"
      ], provider)
      
      const balance = await receiptContract.balanceOf(addr)
      const tokens = []
      
      for (let i = 0; i < Number(balance); i++) {
        try {
          const receiptTokenId = await receiptContract.tokenOfOwnerByIndex(addr, i)
          const originalTokenId = await receiptContract.receiptToOriginalToken(receiptTokenId)
          
          let tokenURI = ''
          try {
            tokenURI = await receiptContract.tokenURI(receiptTokenId)
          } catch {}
          
          tokens.push({
            tokenId: receiptTokenId.toString(),
            originalTokenId: originalTokenId.toString(),
            image: tokenURI
          })
        } catch (error) {
          console.warn(`Failed to fetch receipt token ${i}:`, error)
        }
      }
      
      console.log(`🧾 Receipt NFTs loaded:`, tokens.length)
      setReceiptNFTs(tokens)
      
    } catch (error) {
      console.error('Failed to fetch receipt NFTs:', error)
      setReceiptNFTs([])
    } finally {
      setReceiptLoading(false)
    }
  }

  const fetchPoolNFTs = async (provider) => {
    try {
      console.log('🏊 Fetching pool NFTs for pool:', swapPool)
      const poolContract = new ethers.Contract(swapPool, SwapPoolABI, provider)
      const poolTokenIds = await poolContract.getPoolTokens()
      console.log('🏊 Pool token IDs:', poolTokenIds)
      
      // Get collection address for metadata
      const collectionAddr = await poolContract.nftCollection()
      console.log('🏊 Collection address:', collectionAddr)
      if (!collectionAddr) {
        console.warn('🏊 No collection address found')
        setPoolNFTs([])
        setPoolLoading(false)
        return
      }
      
      const nftContract = new ethers.Contract(collectionAddr, [
        "function tokenURI(uint256) view returns (string)"
      ], provider)
      
      const poolNftPromises = poolTokenIds.map(async (tokenId) => {
        try {
          let tokenURI = ''
          try {
            tokenURI = await nftContract.tokenURI(tokenId)
          } catch {}
          
          return {
            tokenId: tokenId.toString(),
            image: tokenURI
          }
        } catch (error) {
          console.warn(`Failed to fetch pool NFT metadata for token ${tokenId}:`, error)
          return {
            tokenId: tokenId.toString(),
            image: ''
          }
        }
      })
      
      const poolNfts = await Promise.all(poolNftPromises)
      console.log(`🏊 Pool NFTs loaded:`, poolNfts.length)
      setPoolNFTs(poolNfts)
      
    } catch (error) {
      console.error('Failed to fetch pool NFTs:', error)
      setPoolNFTs([])
    } finally {
      setPoolLoading(false)
    }
  }

  const fetchStakedNFTs = async (addr, provider) => {
    try {
      const poolContract = new ethers.Contract(swapPool, SwapPoolABI, provider)
      const staked = await poolContract.getUserStakes(addr)
      setStakedNFTs(staked.map(t => t.toString()))
      console.log(`🔒 Staked NFTs loaded:`, staked.length)
    } catch (error) {
      console.error('Failed to fetch staked NFTs:', error)
      setStakedNFTs([])
    }
  }

  const fetchPendingRewards = async () => {
    if (!address || !stakeReceipt) {
      setPendingRewards('0')
      return
    }
    
    try {
      const signer = await getSigner()
      const receiptContract = new ethers.Contract(stakeReceipt, StakeReceiptABI, signer)
      
      // Try to get pending rewards using earned() function
      if (receiptContract.earned) {
        const earned = await receiptContract.earned(address)
        setPendingRewards(ethers.formatEther(earned))
      } else {
        // Fallback to direct pendingRewards mapping if earned() doesn't exist
        const pending = await receiptContract.pendingRewards(address)
        setPendingRewards(ethers.formatEther(pending))
      }
    } catch (error) {
      console.warn('Failed to fetch pending rewards:', error)
      setPendingRewards('0')
    }
  }

  // Initialize data on mount
  useEffect(() => {
    if (swapPool) {
      refreshNFTs()
      fetchPendingRewards()
    }
  }, [swapPool, stakeReceipt])

  // Refresh data when external provider changes
  useEffect(() => {
    if (swapPool && externalProvider) {
      refreshNFTs()
    }
  }, [externalProvider])

  // Fetch rewards periodically (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPendingRewards()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [address, stakeReceipt])
  
  if (activeInterface === 'swap') {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => setActiveInterface(null)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Actions
        </button>

        <SwapInterface
          walletNFTs={walletNFTs}
          poolNFTs={poolNFTs}
          loading={loading || walletLoading || poolLoading}
          onSwap={handleSwap}
          status={status}
        />
      </div>
    )
  }

  if (activeInterface === 'stake') {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => setActiveInterface(null)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Actions
        </button>

        <StakingInterface
          walletNFTs={walletNFTs}
          receiptNFTs={receiptNFTs}
          stakedNFTs={stakedNFTs}
          loading={loading}
          receiptLoading={receiptLoading}
          onStake={handleStake}
          onUnstake={handleUnstake}
          onClaimRewards={handleClaimRewards}
          status={status}
          approvedMap={approvedMap}
          isApprovedForAll={isApprovedForAll}
          onApproveAll={handleApproveAll}
          approvingAll={approvingAll}
          nftCollection={nftCollection}
          swapPool={swapPool}
          provider={externalProvider}
          pendingRewards={pendingRewards}
        />
      </div>
    )
  }

  // Main action selection interface
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-500 to-teal-400 bg-clip-text text-transparent mb-4">
          What would you like to do?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Choose your action to get started with the swap pool
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Swap NFTs Card */}
        <div className="group">
          <button
            onClick={() => setActiveInterface('swap')}
            className="w-full p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 group-hover:scale-105"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 1H4m0 0l4 4M4 12l4-4" />
                </svg>
              </div>
              
              <div className="text-center">
                <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                  Swap NFTs
                </h3>
                <p className="text-blue-600 dark:text-blue-400 leading-relaxed">
                  Exchange your NFTs with those available in the pool. Perfect for finding specific traits or collecting new pieces.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                <span>Start Swapping</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-blue-500 dark:text-blue-400">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Instant Trading</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" clipRule="evenodd" />
                  </svg>
                  <span>Secure Exchange</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Stake NFTs Card */}
        <div className="group">
          <button
            onClick={() => setActiveInterface('stake')}
            className="w-full p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-200 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 group-hover:scale-105"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              
              <div className="text-center">
                <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                  Stake NFTs
                </h3>
                <p className="text-green-600 dark:text-green-400 leading-relaxed">
                  Stake your NFTs to earn rewards from swap fees and contribute to pool liquidity. Passive income from your collection.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                <span>Start Earning</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-green-500 dark:text-green-400">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                  <span>Earn Rewards</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Pool Liquidity</span>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Pool Stats */}
      <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
          Pool Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {poolNFTs.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Available to Swap
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stakedNFTs.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Currently Staked
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {walletNFTs.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              In Your Wallet
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {receiptNFTs.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Your Receipts
            </div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {status && (
        <div className={`p-4 rounded-xl border transition-all duration-300 ${
          status.includes('successful') || status.includes('✅')
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : status.includes('failed') || status.includes('error')
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
        }`}>
          <div className="text-center font-medium">{status}</div>
        </div>
      )}
    </div>
  )
}