import React, { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import FactoryABI from '../abis/MultiPoolFactoryNonProxy.json'
import PoolDetail from './PoolDetail'
import NFTCollectionImage from './NFTCollectionImage'

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
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [address, setAddress] = useState(null)
  const [pools, setPools] = useState([])
  const [poolNames, setPoolNames] = useState({})
  const [loading, setLoading] = useState(false)
  const [selectedPool, setSelectedPool] = useState(null)
  const [providerError, setProviderError] = useState('')
  const [providerLoading, setProviderLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const factoryAddressEnv = import.meta.env.VITE_FACTORY_ADDRESS || ''
  const [factoryAddress, setFactoryAddress] = useState(factoryAddressEnv)

  useEffect(() => {
    const init = async () => {
      setProviderLoading(true)
      try {
        if (window.ethereum) {
          const p = new ethers.BrowserProvider(window.ethereum)
          setProvider(p)
          setProviderError('')
          console.log('Provider set: window.ethereum')
          // Check chain id and warn if not Sonic (146)
          try {
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' })
            const chainId = parseInt(chainIdHex, 16)
            if (chainId !== 146) {
              console.warn('Connected chainId', chainId, 'expected 146 (Sonic)')
            }
          } catch (e) {
            console.warn('Could not read chainId from injected provider', e)
          }
        } else {
          // Try multiple Sonic RPCs as fallback
          const rpcList = [
            import.meta.env.VITE_RPC_URL,
            'https://rpc.soniclabs.com',
            'https://sonic.drpc.org',
            'https://sonic-mainnet.alt.technology'
          ].filter(Boolean)
          let fallbackProvider = null
          for (const url of rpcList) {
            try {
              const p = new ethers.JsonRpcProvider(url)
              // Try a simple call to ensure it's working
              await p.getBlockNumber()
              fallbackProvider = p
              console.log('Provider set: ' + url)
              break
            } catch (e) {
              console.warn('RPC failed', url, e)
              // Try next
            }
          }
          if (fallbackProvider) {
            setProvider(fallbackProvider)
            setProviderError('')
          } else {
            setProviderError('No Sonic RPC endpoint available. Please check your connection or try again later.')
          }
        }
      } catch (e) {
        setProviderError('Provider init failed: ' + (e.message || e.toString()))
        console.warn('Provider init failed', e)
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

  const connect = async () => {
    if (!window.ethereum) {
      setErrorMessage('Please install MetaMask or another wallet')
      return
    }
    setErrorMessage('')
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const p = new ethers.BrowserProvider(window.ethereum)
      const s = await p.getSigner()
      const addr = await s.getAddress()
      setProvider(p)
      setSigner(s)
      setAddress(addr)
    } catch (err) {
      setErrorMessage('Failed to connect wallet: ' + (err.message || err.toString()))
      console.error(err)
    }
  }

  const fetchPools = async () => {
    if (!factoryAddress) {
      setErrorMessage('Factory address not set. Provide VITE_FACTORY_ADDRESS or public/contracts.json')
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
          setLoading(false)
          setErrorMessage(`Connected to chain ${network.chainId}. Please switch your wallet/RPC to Sonic (chainId 146) and retry.`)
          return
        }

        const code = await provider.send('eth_getCode', [factoryAddress, 'latest'])
        if (!code || code === '0x' || code === '0x0') {
          setLoading(false)
          setErrorMessage(`No contract deployed at ${factoryAddress} on the current network. Make sure the address is correct and you're connected to Sonic (chainId 146).`)
          return
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
    } catch (err) {
      console.error('Failed to fetch pools', err)
      // Display helpful hints
      if (err.code === 'BAD_DATA') {
        setErrorMessage('Failed to decode on-chain result. This often means the contract ABI does not match or you are connected to the wrong RPC/network.')
      } else {
        setErrorMessage('Failed to fetch pools: ' + (err.message || String(err)))
      }
    }
    setLoading(false)
  }

  // Auto-load pools when provider and factory address are ready
  useEffect(() => {
    if (provider && factoryAddress) {
      fetchPools();
    }
    // eslint-disable-next-line
  }, [provider, factoryAddress]);

  return (
    <div className="space-y-6">
      {/* Wallet Connection Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-card/50 rounded-xl border border-accent/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${address ? 'bg-green-400' : provider ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
            <span className="text-sm font-medium">
              {address ? `Connected: ${address.slice(0,6)}...${address.slice(-4)}` : provider ? 'Provider Ready' : 'Not Connected'}
            </span>
          </div>
        </div>
        <button 
          className="px-4 py-2 bg-accent text-white rounded-lg shadow hover:bg-accent/80 transition-colors font-medium" 
          onClick={connect}
        >
          {address ? 'Connected' : 'Connect Wallet'}
        </button>
      </div>

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

      {/* Provider Error */}
      {!providerLoading && providerError && (
        <div className="p-4 bg-red-900/20 border border-red-500/20 text-red-400 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span>🔌</span>
            <span className="font-semibold">Connection Error</span>
          </div>
          <p className="text-sm">{providerError}</p>
        </div>
      )}

      {/* Swap Pools Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-accent">Swap Pools</h2>
            <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
              {pools.length} active
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

        {/* Pool Loading State */}
        {loading && pools.length === 0 ? (
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
        ) : pools.length === 0 ? (
          <div className="p-8 bg-white/90 dark:bg-gray-800/90 rounded-2xl text-center border border-gray-200 dark:border-gray-700">
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
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((p, i) => (
              <div
                key={`${p.swapPool}-${i}`}
                className="group p-4 sm:p-5 bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-400/50 cursor-pointer"
                onClick={() => setSelectedPool(p)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <NFTCollectionImage address={p.nftCollection} size={56} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-blue-600 dark:text-blue-400 mb-1 truncate">
                      {poolNames[p.nftCollection] || 'Loading...'}
                    </h3>
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
          onClose={() => setSelectedPool(null)} 
          provider={provider} 
        />
      )}
    </div>
  )
}
