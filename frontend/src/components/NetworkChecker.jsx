import React, { useState, useEffect } from 'react'

const SONIC_NETWORK = {
  chainId: '0x92', // 146 in hex
  chainName: 'Sonic Network',
  rpcUrls: ['https://rpc.sonic.org'],
  nativeCurrency: {
    name: 'S',
    symbol: 'S',
    decimals: 18,
  },
  blockExplorerUrls: ['https://explorer.sonic.org'],
}

export default function NetworkChecker({ onNetworkReady }) {
  const [currentChainId, setCurrentChainId] = useState(null)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [switchingNetwork, setSwitchingNetwork] = useState(false)

  useEffect(() => {
    checkNetwork()
    
    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged)
      return () => window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [])

  const handleChainChanged = (chainId) => {
    const numericChainId = parseInt(chainId, 16)
    setCurrentChainId(numericChainId)
    setIsCorrectNetwork(numericChainId === 146)
    
    if (numericChainId === 146) {
      onNetworkReady?.(true)
    }
  }

  const checkNetwork = async () => {
    if (!window.ethereum) return
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const numericChainId = parseInt(chainId, 16)
      setCurrentChainId(numericChainId)
      setIsCorrectNetwork(numericChainId === 146)
      
      if (numericChainId === 146) {
        onNetworkReady?.(true)
      }
    } catch (error) {
      console.warn('Failed to check network:', error)
    }
  }

  const switchToSonic = async () => {
    if (!window.ethereum) return
    
    setSwitchingNetwork(true)
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SONIC_NETWORK.chainId }],
      })
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SONIC_NETWORK],
          })
        } catch (addError) {
          console.error('Failed to add Sonic network:', addError)
        }
      } else {
        console.error('Failed to switch to Sonic network:', switchError)
      }
    }
    
    setSwitchingNetwork(false)
  }

  if (!window.ethereum) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">🦊</span>
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Wallet Required</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Please install MetaMask or another Ethereum wallet to continue.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!isCorrectNetwork && currentChainId !== null) {
    return (
      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🔄</span>
            </div>
            <div>
              <h3 className="font-semibold text-orange-800 dark:text-orange-200">Wrong Network</h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Please switch to Sonic Network (Chain ID: 146)
              </p>
            </div>
          </div>
          <button
            onClick={switchToSonic}
            disabled={switchingNetwork}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {switchingNetwork ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Switching...
              </>
            ) : (
              <>
                <span>🔄</span>
                Switch to Sonic
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  return null // Network is correct, no need to show anything
}