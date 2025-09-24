import React from 'react'
import { useWallet } from './WalletProvider'

export default function WalletButton() {
  const { 
    address, 
    isConnecting, 
    isCorrectNetwork, 
    connectWallet, 
    disconnect, 
    switchToSonicNetwork,
    isConnected 
  } = useWallet()

  const handleConnect = async () => {
    try {
      await connectWallet()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  const handleNetworkSwitch = async () => {
    try {
      await switchToSonicNetwork()
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected && !isCorrectNetwork) {
    return (
      <button
        onClick={handleNetworkSwitch}
        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
      >
        ⚠️ Switch to Sonic
      </button>
    )
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 text-green-800 dark:text-green-200 rounded-xl font-semibold text-sm shadow-sm border border-green-200 dark:border-green-700">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          {formatAddress(address)}
        </div>
        <button
          onClick={disconnect}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          title="Disconnect wallet"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed"
    >
      {isConnecting ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Connecting...
        </>
      ) : (
        <>
          🔗 Connect Wallet
        </>
      )}
    </button>
  )
}