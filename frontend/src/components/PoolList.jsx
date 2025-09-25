import React, { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import FactoryABI from '../abis/MultiPoolFactoryNonProxy.json'
import StakeReceiptABI from '../abis/StakeReceipt.json'
import PoolDetail from './PoolDetail'
import NFTCollectionImage from './NFTCollectionImage'
import { useWallet } from './WalletProvider'

// Helper to fetch ERC721 name
async function fetchCollectionName(address, provider) {
  try {
    const nft = new ethers.Contract(address, ["function name() view returns (string)"], provider)
    return await nft.name()
  } catch {
    return 'Unknown Collection'
  }
}

export default function PoolList() {
  const { address, provider: walletProvider, signer, isConnected, isCorrectNetwork } = useWallet()
  const [pools, setPools] = useState([])
  const [poolNames, setPoolNames] = useState({})
  const [loading, setLoading] = useState(false)
  const [selectedPool, setSelectedPool] = useState(null)
  const [provider, setProvider] = useState(null)
  const [providerError, setProviderError] = useState('')
  const [providerLoading, setProviderLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showStakedOnly, setShowStakedOnly] = useState(false)
  const [userStakedPools, setUserStakedPools] = useState(new Set())
  const [totalPendingRewards, setTotalPendingRewards] = useState('0')
  const [claimingAll, setClaimingAll] = useState(false)
  const [claimAllStatus, setClaimAllStatus] = useState('')

  const factoryAddressEnv = import.meta.env.VITE_FACTORY_ADDRESS || ''
  const [factoryAddress, setFactoryAddress] = useState(factoryAddressEnv)

  // Check if user has stakes in any pools
  const checkUserStakes = async (poolsToCheck, providerToUse) => {
    if (!address || !providerToUse) return
    
    const stakedPools = new Set()
    
    try {
      // Check each pool to see if user has staked NFTs (receipt tokens)
      for (const pool of poolsToCheck) {
        try {
          const receiptContract = new ethers.Contract(
            pool.stakeReceipt, 
            ["function balanceOf(address) view returns (uint256)"], 
            providerToUse
          )
          const balance = await receiptContract.balanceOf(address)
          if (Number(balance) > 0) {
            stakedPools.add(pool.swapPool)
          }
        } catch (err) {
          console.warn(`Failed to check stakes for pool ${pool.swapPool}:`, err)
        }
      }
    } catch (err) {
      console.warn('Failed to check user stakes:', err)
    }
    
    setUserStakedPools(stakedPools)
  }

  // Filter pools based on search and staked filter
  const filteredPools = pools.filter(pool => {
    // Search filter
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || 
      (poolNames[pool.nftCollection] && poolNames[pool.nftCollection].toLowerCase().includes(searchLower)) ||
      pool.nftCollection.toLowerCase().includes(searchLower) ||
      pool.swapPool.toLowerCase().includes(searchLower)
    
    // Staked filter
    const matchesStaked = !showStakedOnly || userStakedPools.has(pool.swapPool)
    
    return matchesSearch && matchesStaked
  })

  useEffect(() => {
    const init = async () => {
      setProviderLoading(true)
      let providerSet = false
      
      try {
        // Always try fallback RPC providers first to ensure pools can load
        const rpcList = [
          import.meta.env.VITE_RPC_URL,
          'https://rpc.soniclabs.com',
          'https://sonic.drpc.org',
          'https://sonic.api.onfinality.io/public',
          'https://sonic-rpc.publicnode.com'
        ].filter(Boolean)
        
        for (const url of rpcList) {
          try {
            const p = new ethers.JsonRpcProvider(url)
            // Try a simple call to ensure it's working
            await p.getBlockNumber()
            setProvider(p)
            setProviderError('')
            console.log('Provider set: ' + url)
            providerSet = true
            break
          } catch (e) {
            console.warn('RPC failed', url, e)
            // Try next
          }
        }
        
        // If wallet is available and RPC fallback worked, we can still use wallet for transactions
        if (window.ethereum && providerSet) {
          try {
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' })
            const chainId = parseInt(chainIdHex, 16)
            if (chainId !== 146) {
              console.warn('Wallet connected to chainId', chainId, 'but using RPC for read operations')
            }
          } catch (e) {
            console.warn('Could not read chainId from wallet', e)
          }
        }
        
        if (!providerSet) {
          console.warn('No working provider found')
        }
      } catch (e) {
        console.warn('Provider init failed', e)
        // Don't set provider error since we want pools to still try to load
      }
      
      setProviderLoading(false)
      
      // If factory address not provided at build-time, try to fetch runtime config
      if (!factoryAddressEnv) {
        try {
          const resp = await fetch('/contracts.json')
          if (resp.ok) {
            const json = await resp.json()
            if (json.factoryAddress) setFactoryAddress(json.factoryAddress)
          }
        } catch (e) {
          // ignore - will show message when attempting to load pools
        }
      }
    }
    init()
  }, [])



  const fetchPools = async () => {
    if (!factoryAddress) {
      console.warn('Factory address not set. Provide VITE_FACTORY_ADDRESS or public/contracts.json')
      return
    }
    if (!provider) {
      console.warn('fetchPools called without provider')
      return
    }
    setLoading(true)
    setErrorMessage('')
    try {
      // Quick network / contract validation
      try {
        const network = await provider.getNetwork()
        // network.chainId for ethers v6 returns a number
        if (network && network.chainId && Number(network.chainId) !== 146) {
          console.warn(`Connected to chain ${network.chainId}, expected 146 (Sonic)`)
          // Continue anyway - user might still want to see pools
        }

        const code = await provider.send('eth_getCode', [factoryAddress, 'latest'])
        if (!code || code === '0x' || code === '0x0') {
          console.warn(`No contract found at ${factoryAddress}`)
          // Continue anyway - might be a temporary issue
        }
      } catch (err) {
        console.warn('Network/code check failed', err)
        // continue - provider might not support some RPC methods
      }

      const contract = new ethers.Contract(factoryAddress, FactoryABI, provider)

      // Get all pools from factory
      let allPools = []
      try {
        allPools = await contract.getAllPools()
        // Filter only active pools
        allPools = allPools.filter(p => p.active)
      } catch (e) {
        console.error('Failed to get pools from factory:', e)
        allPools = []
      }

      // Debug: log allPools before processing
      console.log('All active pools from contract:', allPools)

      // Don't deduplicate - show all pools even if they share the same NFT collection
      // Users may have multiple pools for the same collection with different parameters
      const mapped = allPools.map(p => ({
        nftCollection: p.nftCollection,
        swapPool: p.swapPool,
        stakeReceipt: p.stakeReceipt,
        createdAt: new Date(Number(p.createdAt) * 1000).toLocaleString(),
        creator: p.creator,
        active: p.active,
        poolAddress: p.swapPool // Keep track of unique pool address
      }))
      
      console.log('All pools (no deduplication applied):', mapped)
      setPools(mapped)

      // Fetch collection names
      const names = {}
      for (const p of mapped) {
        names[p.nftCollection] = await fetchCollectionName(p.nftCollection, provider)
      }
      setPoolNames(names)
      
      // Check user stakes if wallet is connected
      if (address) {
        await checkUserStakes(mapped, provider)
      }
    } catch (err) {
      console.error('Failed to fetch pools', err)
      // Don't show error message - just log it and let the UI show "No pools found"
      // This makes the app more resilient to network issues
    }
    setLoading(false)
  }

  // Calculate total pending rewards across all staked pools
  const calculateTotalRewards = async () => {
    if (!address || !provider || userStakedPools.size === 0) {
      setTotalPendingRewards('0')
      return
    }

    try {
      let totalRewards = ethers.parseEther('0')
      
      for (const pool of pools) {
        if (userStakedPools.has(pool.swapPool)) {
          try {
            const receiptContract = new ethers.Contract(pool.stakeReceipt, StakeReceiptABI, provider)
            
            // Try to get pending rewards using earned() function first
            let pendingRewards
            if (receiptContract.earned) {
              pendingRewards = await receiptContract.earned(address)
            } else {
              // Fallback to direct pendingRewards mapping
              pendingRewards = await receiptContract.pendingRewards(address)
            }
            
            totalRewards = totalRewards + pendingRewards
          } catch (error) {
            console.warn(`Failed to fetch rewards for pool ${pool.swapPool}:`, error)
          }
        }
      }
      
      setTotalPendingRewards(ethers.formatEther(totalRewards))
    } catch (error) {
      console.error('Failed to calculate total rewards:', error)
      setTotalPendingRewards('0')
    }
  }

  // Claim rewards from all staked pools
  const claimAllRewards = async () => {
    if (!signer || userStakedPools.size === 0) return

    setClaimingAll(true)
    setClaimAllStatus("Claiming rewards from all pools...")

    try {
      let successCount = 0
      let failCount = 0

      for (const pool of pools) {
        if (userStakedPools.has(pool.swapPool)) {
          try {
            const receiptContract = new ethers.Contract(pool.stakeReceipt, StakeReceiptABI, signer)
            
            // Check if there are rewards to claim
            let pendingRewards
            if (receiptContract.earned) {
              pendingRewards = await receiptContract.earned(address)
            } else {
              pendingRewards = await receiptContract.pendingRewards(address)
            }
            
            if (pendingRewards > 0) {
              const tx = await receiptContract.claimRewards()
              await tx.wait()
              successCount++
              console.log(`✅ Claimed rewards from pool: ${pool.swapPool}`)
            }
          } catch (error) {
            failCount++
            console.error(`❌ Failed to claim from pool ${pool.swapPool}:`, error)
          }
        }
      }

      if (successCount > 0) {
        setClaimAllStatus(`✅ Successfully claimed rewards from ${successCount} pool(s)!`)
        // Refresh rewards calculation
        await calculateTotalRewards()
      } else if (failCount > 0) {
        setClaimAllStatus(`❌ Failed to claim rewards from ${failCount} pool(s)`)
      } else {
        setClaimAllStatus("No rewards to claim")
      }

    } catch (error) {
      setClaimAllStatus(`❌ Claim all failed: ${error.reason || error.message}`)
    }

    setClaimingAll(false)
    // Clear status after 5 seconds
    setTimeout(() => setClaimAllStatus(''), 5000)
  }

  // Auto-load pools when provider and factory address are ready
  useEffect(() => {
    if (provider && factoryAddress) {
      fetchPools();
    }
    // eslint-disable-next-line
  }, [provider, factoryAddress]);

  // Calculate rewards when pools or user stakes change
  useEffect(() => {
    calculateTotalRewards()
  }, [pools, userStakedPools, address])

  // Recalculate rewards periodically
  useEffect(() => {
    if (userStakedPools.size > 0) {
      const interval = setInterval(calculateTotalRewards, 30000) // Every 30 seconds
      return () => clearInterval(interval)
    }
  }, [userStakedPools])

  return (
    <div className="space-y-6">

      {/* Error Messages */}
      {errorMessage && (
        <div className="p-4 bg-red-900/20 border border-red-500/20 text-red-400 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span>⚠️</span>
            <span className="font-semibold">Error</span>
          </div>
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Provider Loading */}
      {providerLoading && (
        <div className="p-6 bg-card/30 rounded-xl text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="font-semibold">Connecting to Sonic Network...</span>
          </div>
          <p className="text-sm text-muted">Please wait while we establish connection</p>
        </div>
      )}



      {/* Claim All Rewards Section */}
      {isConnected && userStakedPools.size > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                  Total Pending Rewards
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {totalPendingRewards} S
                </div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300">
                  From {userStakedPools.size} staked pool{userStakedPools.size !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={claimAllRewards}
                disabled={claimingAll || parseFloat(totalPendingRewards) === 0}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                {claimingAll ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Claiming...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Claim All Rewards
                  </>
                )}
              </button>
              {claimAllStatus && (
                <div className={`text-sm font-medium ${
                  claimAllStatus.includes('✅') 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {claimAllStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Swap Pools Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-accent">Swap Pools</h2>
            <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
              {filteredPools.length} {showStakedOnly ? 'staked' : 'active'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted">
              Factory: <span className="font-mono text-accent">{factoryAddress?.slice(0, 6)}...{factoryAddress?.slice(-4) || 'Not set'}</span>
            </div>
            <button 
              onClick={fetchPools} 
              disabled={loading}
              className="px-4 py-2 bg-accent text-white rounded-lg shadow hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? 'Loading...' : 'Refresh Pools'}
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by collection name, address, or pool address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm placeholder-gray-500 dark:placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showStakedOnly}
                onChange={(e) => setShowStakedOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="flex items-center gap-1">
                <span className="text-green-500">🎯</span>
                My Staked Pools
              </span>
            </label>
            {showStakedOnly && (
              <div className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded text-xs font-medium">
                {userStakedPools.size} staked
              </div>
            )}
          </div>
        </div>

        {/* Pool Loading State */}
        {loading && filteredPools.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 sm:p-5 bg-card rounded-2xl shadow-lg animate-pulse">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-600 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-600 rounded w-2/3"></div>
                    <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-600 rounded w-16"></div>
                    <div className="h-6 bg-gray-600 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPools.length === 0 ? (
          <div className="p-8 bg-white/90 dark:bg-gray-800/90 rounded-2xl text-center border border-gray-200 dark:border-gray-700">
            {pools.length === 0 ? (
              <>
                <div className="text-6xl mb-4">🏊‍♂️</div>
                <h3 className="text-xl font-semibold mb-2">No Swap Pools Found</h3>
                <p className="text-muted mb-4">
                  {factoryAddress ? 'No pools are currently registered with this factory.' : 'Please set a factory address first.'}
                </p>
                {factoryAddress && (
                  <button 
                    onClick={fetchPools}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
                  >
                    Refresh Pools
                  </button>
                )}
              </>
            ) : showStakedOnly ? (
              <>
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold mb-2">No Staked Pools</h3>
                <p className="text-muted mb-4">
                  You haven't staked any NFTs in pools yet. Start staking to earn rewards from trading fees!
                </p>
                <button 
                  onClick={() => setShowStakedOnly(false)}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
                >
                  Show All Pools
                </button>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
                <p className="text-muted mb-4">
                  No pools match your search "{searchQuery}". Try adjusting your search terms.
                </p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
                >
                  Clear Search
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPools.map((p, i) => (
              <div
                key={`${p.swapPool}-${i}`}
                className="group p-4 sm:p-5 bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-400/50 cursor-pointer"
                onClick={() => setSelectedPool(p)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <NFTCollectionImage 
                      address={p.nftCollection} 
                      collectionName={poolNames[p.nftCollection]} 
                      size={56} 
                    />
                    {userStakedPools.has(p.swapPool) && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-blue-600 dark:text-blue-400 truncate">
                        {poolNames[p.nftCollection] || 'Loading...'}
                      </h3>
                      {userStakedPools.has(p.swapPool) && (
                        <div className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
                          <span>🎯</span>
                          <span>Staked</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted font-mono truncate">
                      {p.nftCollection.slice(0, 8)}...{p.nftCollection.slice(-6)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-muted mb-4">
                  <div className="flex justify-between">
                    <span>Pool:</span>
                    <span className="font-mono">{p.swapPool.slice(0, 8)}...{p.swapPool.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Receipt:</span>
                    <span className="font-mono">{p.stakeReceipt.slice(0, 8)}...{p.stakeReceipt.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(Number(p.createdAt)).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button 
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPool(p)
                    }}
                  >
                    View Details
                  </button>
                  <button 
                    className="px-3 py-2 bg-secondary/50 hover:bg-secondary text-text rounded-lg transition-colors text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(p.swapPool)
                    }}
                    title="Copy pool address"
                  >
                    📋
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pool Detail Modal */}
      {selectedPool && (
        <PoolDetail 
          pool={selectedPool} 
          collectionName={poolNames[selectedPool.nftCollection]}
          onClose={() => setSelectedPool(null)} 
          provider={provider} 
        />
      )}
    </div>
  )
}
