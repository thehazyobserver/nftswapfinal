import React, { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import FactoryABI from '../abis/MultiPoolFactoryNonProxy.json'
import PoolDetail from './PoolDetail'
import NFTCollectionImage from './NFTCollectionImage'
import StonerFeePoolActions from './StonerFeePoolActions'

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

  const factoryAddressEnv = import.meta.env.VITE_FACTORY_ADDRESS || ''
  const [factoryAddress, setFactoryAddress] = useState(factoryAddressEnv)

  useEffect(() => {
    const init = async () => {
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
    if (!window.ethereum) return alert('Please install MetaMask or another wallet')
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const p = new ethers.BrowserProvider(window.ethereum)
      const s = await p.getSigner()
      const addr = await s.getAddress()
      setProvider(p)
      setSigner(s)
      setAddress(addr)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchPools = async () => {
  if (!factoryAddress) return alert('Factory address not set. Provide VITE_FACTORY_ADDRESS or public/contracts.json')
    if (!provider) {
      setProviderError('No provider available. Please connect your wallet or check your RPC settings.')
      return
    }
    setLoading(true)
    try {
      // Quick network / contract validation
      try {
        const network = await provider.getNetwork()
        // network.chainId for ethers v6 returns a number
        if (network && network.chainId && Number(network.chainId) !== 146) {
          setLoading(false)
          return alert(`Connected to chain ${network.chainId}. Please switch your wallet/RPC to Sonic (chainId 146) and retry.`)
        }

        const code = await provider.send('eth_getCode', [factoryAddress, 'latest'])
        if (!code || code === '0x' || code === '0x0') {
          setLoading(false)
          return alert(`No contract deployed at ${factoryAddress} on the current network. Make sure the address is correct and you're connected to Sonic (chainId 146).`)
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
        alert('Failed to decode on-chain result. This often means the contract ABI does not match or you are connected to the wrong RPC/network.')
      } else {
        alert('Failed to fetch pools: ' + (err.message || String(err)))
      }
    }
    setLoading(false)
  }

  // Auto-load pools on mount
  useEffect(() => {
    fetchPools();
    // eslint-disable-next-line
  }, [provider, factoryAddress]);

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-50">
        <button className="px-4 py-2 bg-accent text-white rounded shadow hover:bg-accent/80 transition" onClick={connect}>
          {address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Connect Wallet'}
        </button>
      </div>
      {providerError && (
        <div className="p-4 bg-red-100 text-red-700 rounded shadow text-center font-semibold mb-6 mt-8">
          {providerError}
        </div>
      )}
      <StonerFeePoolActions />
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-2 mt-12">
        <div className="text-xs sm:text-sm text-muted dark:text-muted">Factory: {factoryAddress || 'Not set'}</div>
        <button 
          onClick={fetchPools} 
          disabled={loading}
          className="px-4 py-2 bg-accent text-white rounded shadow hover:bg-accent/80 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          {loading ? 'Loading...' : 'Refresh Pools'}
        </button>
      </div>


      {loading && pools.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 sm:p-5 bg-card dark:bg-card rounded-2xl shadow-lg animate-pulse">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center">
                <div className="w-14 h-14 bg-gray-300 rounded"></div>
                <div className="flex-1 w-full space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                  <div className="flex gap-2 mt-4">
                    <div className="h-6 bg-gray-300 rounded w-16"></div>
                    <div className="h-6 bg-gray-300 rounded w-20"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : pools.length === 0 ? (
        <div className="p-6 bg-card rounded shadow text-center">
          <div className="text-4xl mb-4">🏊‍♂️</div>
          <div className="text-muted dark:text-muted mb-2">No pools found</div>
          <div className="text-sm text-muted dark:text-muted">
            {factoryAddress ? 'Try refreshing or check if any pools are registered with this factory.' : 'Please set a factory address first.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {pools.map((p, i) => (
            <div
              key={`${p.swapPool}-${i}`}
              className="p-4 sm:p-5 bg-card dark:bg-card rounded-2xl shadow-lg flex flex-col sm:flex-row gap-4 sm:gap-5 items-center transition-transform duration-200 hover:scale-105 hover:shadow-2xl border border-transparent hover:border-accent/30 cursor-pointer"
              style={{ minHeight: 120 }}
            >
              <NFTCollectionImage address={p.nftCollection} size={56} />
              <div className="flex-1 w-full">
                <div className="font-semibold text-base sm:text-lg text-accent mb-1">
                  {poolNames[p.nftCollection] || 'Collection'}
                  <span className="font-mono text-muted dark:text-muted ml-2">
                    {p.nftCollection.slice(0, 6)}...{p.nftCollection.slice(-4)}
                  </span>
                </div>
                <div className="text-xs text-muted dark:text-muted">
                  Pool: <span className="font-mono">{p.swapPool.slice(0, 8)}...{p.swapPool.slice(-6)}</span>
                </div>
                <div className="text-xs text-muted dark:text-muted">
                  Receipt: <span className="font-mono">{p.stakeReceipt.slice(0, 8)}...{p.stakeReceipt.slice(-6)}</span>
                </div>
                <div className="text-xs text-muted dark:text-muted">
                  Creator: <span className="font-mono">{p.creator.slice(0, 6)}...{p.creator.slice(-4)}</span>
                </div>
                <div className="text-xs text-muted dark:text-muted mt-1">Created: {p.createdAt}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="px-3 py-1 bg-gradient-to-r from-accent to-indigo-700 text-white rounded shadow hover:from-indigo-600 hover:to-blue-600 transition text-xs" onClick={() => setSelectedPool(p)}>Details</button>
                  <button className="px-3 py-1 bg-secondary text-text rounded hover:bg-accent/20 text-xs" onClick={() => navigator.clipboard.writeText(p.swapPool)}>Copy Pool</button>
                  <button className="px-3 py-1 bg-secondary text-text rounded hover:bg-accent/20 text-xs" onClick={() => navigator.clipboard.writeText(p.stakeReceipt)}>Copy Receipt</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pass provider to PoolDetail if open */}
      {selectedPool && <PoolDetail pool={selectedPool} onClose={() => setSelectedPool(null)} provider={provider} />}
    </div>
  )
}
