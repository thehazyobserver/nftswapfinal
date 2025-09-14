import React, { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import FactoryABI from '../abis/MultiPoolFactoryNonProxy.json'
import PoolDetail from './PoolDetail'
import NFTCollectionImage from './NFTCollectionImage'
import StonerFeePoolActions from './StonerFeePoolActions'

export default function PoolList() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [address, setAddress] = useState(null)
  const [pools, setPools] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedPool, setSelectedPool] = useState(null)

  const factoryAddressEnv = import.meta.env.VITE_FACTORY_ADDRESS || ''
  const [factoryAddress, setFactoryAddress] = useState(factoryAddressEnv)

  useEffect(() => {
    const init = async () => {
      // Prefer using injected wallet RPC (MetaMask) when available
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
              // only warn; user can still switch in wallet
              // but we surface an alert when they try to load pools
            }
          } catch (e) {
            console.warn('Could not read chainId from injected provider', e)
          }
        } else if (import.meta.env.VITE_RPC_URL) {
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
      if (contract.getAllPools) {
        try {
          allPools = await contract.getAllPools()
        } catch (e) {
          // ignore and fallback
          allPools = []
        }
      }

      if (!allPools || allPools.length === 0) {
        const collections = await contract.getAllCollections()
        const mapped = []
        for (const c of collections) {
          try {
            const info = await contract.getPoolInfo(c)
            mapped.push({
              nftCollection: c,
              swapPool: info.swapPool,
              stakeReceipt: info.stakeReceipt,
              createdAt: new Date(Number(info.createdAt) * 1000).toLocaleString(),
              creator: info.creator,
              active: info.exists
            })
          } catch (e) {
            console.warn('Failed to getPoolInfo for', c, e)
          }
        }
        setPools(mapped)
      } else {
        const mapped = allPools.map(p => ({
          nftCollection: p.nftCollection,
          swapPool: p.swapPool,
          stakeReceipt: p.stakeReceipt,
          createdAt: new Date(Number(p.createdAt) * 1000).toLocaleString(),
          creator: p.creator,
          active: p.active
        }))
        setPools(mapped)
      }
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

  return (
    <div>
      <StonerFeePoolActions />
  <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={connect}>
            {address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Connect Wallet'}
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={fetchPools}>
            {loading ? 'Loading…' : 'Load Pools'}
          </button>
        </div>
        <div className="text-sm text-gray-600">Factory: {factoryAddress || 'Not set'}</div>
      </div>

      {pools.length === 0 ? (
        <div className="p-6 bg-white rounded shadow">No pools loaded. Click "Load Pools".</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pools.map((p, i) => (
            <div key={i} className="p-4 bg-white rounded shadow flex gap-4 items-center">
              <NFTCollectionImage address={p.nftCollection} size={48} />
              <div className="flex-1">
                <div className="font-semibold">Collection: {p.nftCollection}</div>
                <div className="text-sm text-gray-600">SwapPool: {p.swapPool}</div>
                <div className="text-sm text-gray-600">Receipt: {p.stakeReceipt}</div>
                <div className="text-sm text-gray-500 mt-2">Created: {p.createdAt}</div>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1 bg-indigo-500 text-white rounded" onClick={() => setSelectedPool(p)}>Details</button>
                  <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => navigator.clipboard.writeText(p.swapPool)}>Copy Swap</button>
                  <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => navigator.clipboard.writeText(p.stakeReceipt)}>Copy Receipt</button>
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
