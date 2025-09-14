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

  const factoryAddressEnv = import.meta.env.VITE_FACTORY_ADDRESS || ''
  const [factoryAddress, setFactoryAddress] = useState(factoryAddressEnv)

  useEffect(() => {
    const init = async () => {
      try {
        if (window.ethereum) {
          const p = new ethers.BrowserProvider(window.ethereum)
          setProvider(p)
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
        } 
        // Always set a fallback provider for read-only mode
        if (!window.ethereum && import.meta.env.VITE_RPC_URL) {
          const p = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL)
          setProvider(p)
        }
      } catch (e) {
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
    if (!provider) return alert('No provider')
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

      // Prefer getAllPools if available, otherwise fall back to getAllCollections + getPoolInfo
      let allPools = []
      if (contract.getActivePools) {
        try {
          allPools = await contract.getActivePools()
        } catch (e) {
          allPools = []
        }
      } else if (contract.getAllPools) {
        try {
          allPools = (await contract.getAllPools()).filter(p => p.active)
        } catch (e) {
          allPools = []
        }
      }

      // Deduplicate by nftCollection, keep latest by createdAt
      const latestByCollection = {}
      for (const p of allPools) {
        if (!latestByCollection[p.nftCollection] || Number(p.createdAt) > Number(latestByCollection[p.nftCollection].createdAt)) {
          latestByCollection[p.nftCollection] = p
        }
      }
      const mapped = Object.values(latestByCollection).map(p => ({
        nftCollection: p.nftCollection,
        swapPool: p.swapPool,
        stakeReceipt: p.stakeReceipt,
        createdAt: new Date(Number(p.createdAt) * 1000).toLocaleString(),
        creator: p.creator,
        active: p.active
      }))
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
      <StonerFeePoolActions />
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-2 mt-12">
        <div className="text-xs sm:text-sm text-muted dark:text-muted">Factory: {factoryAddress || 'Not set'}</div>
      </div>

      {pools.length === 0 ? (
        <div className="p-6 bg-card rounded shadow text-center text-muted dark:text-muted">No pools loaded.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {pools.map((p, i) => (
            <div
              key={i}
              className="p-4 sm:p-5 bg-card dark:bg-card rounded-2xl shadow-lg flex flex-col sm:flex-row gap-4 sm:gap-5 items-center transition-transform duration-200 hover:scale-105 hover:shadow-2xl border border-transparent hover:border-accent/30 cursor-pointer"
              style={{ minHeight: 120 }}
            >
              <NFTCollectionImage address={p.nftCollection} size={56} />
              <div className="flex-1 w-full">
                <div className="font-semibold text-base sm:text-lg text-accent mb-1">{poolNames[p.nftCollection] || 'Collection'} <span className="font-mono text-muted dark:text-muted">{p.nftCollection.slice(0, 6)}...{p.nftCollection.slice(-4)}</span></div>
                <div className="text-xs text-muted dark:text-muted">SwapPool: <span className="font-mono">{p.swapPool.slice(0, 6)}...{p.swapPool.slice(-4)}</span></div>
                <div className="text-xs text-muted dark:text-muted">Receipt: <span className="font-mono">{p.stakeReceipt.slice(0, 6)}...{p.stakeReceipt.slice(-4)}</span></div>
                <div className="text-xs text-muted dark:text-muted mt-1">Created: {p.createdAt}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="px-3 py-1 bg-gradient-to-r from-accent to-indigo-700 text-white rounded shadow hover:from-indigo-600 hover:to-blue-600 transition" onClick={() => setSelectedPool(p)}>Details</button>
                  <button className="px-3 py-1 bg-secondary text-text rounded hover:bg-accent/20" onClick={() => navigator.clipboard.writeText(p.swapPool)}>Copy Swap</button>
                  <button className="px-3 py-1 bg-secondary text-text rounded hover:bg-accent/20" onClick={() => navigator.clipboard.writeText(p.stakeReceipt)}>Copy Receipt</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPool && <PoolDetail pool={selectedPool} onClose={() => setSelectedPool(null)} />}
    </div>
  )
}
