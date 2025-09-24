import React, { useState, useEffect } from 'react'
import { useToast } from './ToastProvider'

const WALLET_TYPES = {
  METAMASK: 'metamask',
  WALLETCONNECT: 'walletconnect',
  COINBASE: 'coinbase',
  BROWSER: 'browser'
}

export default function MobileWalletConnector({ onConnect, isConnecting, currentAccount }) {
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const toast = useToast()

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      return mobileRegex.test(userAgent) || window.innerWidth <= 768
    }

    setIsMobile(checkMobile())

    const handleResize = () => {
      setIsMobile(checkMobile())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const walletOptions = [
    {
      id: WALLET_TYPES.METAMASK,
      name: 'MetaMask',
      icon: '🦊',
      description: 'Popular browser extension',
      available: typeof window.ethereum !== 'undefined',
      mobileLink: 'https://metamask.app.link/dapp/' + window.location.host,
      desktopAction: () => connectMetaMask()
    },
    {
      id: WALLET_TYPES.WALLETCONNECT,
      name: 'WalletConnect',
      icon: '📱',
      description: 'Mobile wallets & more',
      available: true,
      mobileAction: () => connectWalletConnect(),
      desktopAction: () => connectWalletConnect()
    },
    {
      id: WALLET_TYPES.COINBASE,
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Coinbase mobile app',
      available: true,
      mobileLink: 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(window.location.href),
      desktopAction: () => connectCoinbaseWallet()
    }
  ]

  const connectMetaMask = async () => {
    try {
      if (!window.ethereum) {
        toast.error('MetaMask not installed. Please install MetaMask extension.')
        return
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length > 0) {
        onConnect(accounts[0])
        setIsModalOpen(false)
        toast.success('Connected to MetaMask successfully!')
      }
    } catch (error) {
      console.error('MetaMask connection failed:', error)
      if (error.code === 4001) {
        toast.error('Connection rejected by user')
      } else {
        toast.error('Failed to connect to MetaMask')
      }
    }
  }

  const connectWalletConnect = async () => {
    try {
      // For now, show info message about WalletConnect
      // In production, you would implement actual WalletConnect v2
      toast.info('WalletConnect integration coming soon! Use MetaMask mobile for now.')
      
      // Placeholder for WalletConnect implementation
      // const { EthereumProvider } = await import('@walletconnect/ethereum-provider')
      // const provider = await EthereumProvider.init({
      //   projectId: 'YOUR_PROJECT_ID',
      //   chains: [146], // Sonic Network
      //   showQrModal: true
      // })
      // await provider.connect()
      // onConnect(provider.accounts[0])
    } catch (error) {
      toast.error('WalletConnect connection failed')
    }
  }

  const connectCoinbaseWallet = async () => {
    try {
      toast.info('Coinbase Wallet integration coming soon! Use MetaMask for now.')
    } catch (error) {
      toast.error('Coinbase Wallet connection failed')
    }
  }

  const handleWalletSelect = async (wallet) => {
    setSelectedWallet(wallet.id)
    
    if (isMobile && wallet.mobileLink) {
      // On mobile, try to open the wallet app first
      window.open(wallet.mobileLink, '_blank')
      
      // Then try to connect
      setTimeout(() => {
        if (wallet.mobileAction) {
          wallet.mobileAction()
        } else if (wallet.desktopAction) {
          wallet.desktopAction()
        }
      }, 1000)
    } else if (wallet.desktopAction) {
      await wallet.desktopAction()
    }
    
    setSelectedWallet(null)
  }

  if (currentAccount) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm">✓</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Connected
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 font-mono truncate">
            {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={isConnecting}
        className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-3 touch-manipulation"
        style={{ minHeight: '48px' }} // Ensure minimum touch target
      >
        {isConnecting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="loading-dots">Connecting</span>
          </>
        ) : (
          <>
            <span className="text-lg">👛</span>
            Connect Wallet
          </>
        )}
      </button>

      {/* Wallet Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl transform transition-all"
            style={{ 
              maxHeight: '90vh',
              animation: isMobile ? 'slide-up 0.3s ease-out' : 'scale-up 0.2s ease-out'
            }}
          >
            {/* Handle for mobile */}
            {isMobile && (
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-3 mb-4"></div>
            )}
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Connect Wallet
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Choose your preferred wallet
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors touch-manipulation"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Wallet Options */}
            <div className="px-6 pb-6 space-y-3">
              {walletOptions.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletSelect(wallet)}
                  disabled={selectedWallet === wallet.id || (!wallet.available && !isMobile)}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 touch-manipulation ${
                    wallet.available || isMobile
                      ? 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      : 'border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed'
                  } ${
                    selectedWallet === wallet.id 
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' 
                      : 'bg-white dark:bg-gray-800'
                  }`}
                  style={{ minHeight: '72px' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{wallet.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {wallet.name}
                        </span>
                        {selectedWallet === wallet.id && (
                          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {wallet.description}
                      </p>
                      {!wallet.available && !isMobile && (
                        <p className="text-xs text-red-500 mt-1">Not available</p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            {/* Mobile Instructions */}
            {isMobile && (
              <div className="px-6 pb-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 On mobile, selecting a wallet will try to open the app automatically
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes scale-up {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}