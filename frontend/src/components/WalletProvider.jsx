import React, { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'

const WalletContext = createContext()

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

export const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState('')
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)

  // Check if wallet was previously connected on app load
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (!window.ethereum) return

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          await connectWallet()
        }
      } catch (error) {
        console.log('No existing wallet connection found')
      }
    }

    checkExistingConnection()
  }, [])

  // Listen for account changes
  useEffect(() => {
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        disconnect()
      } else if (accounts[0] !== address) {
        // User switched accounts
        await connectWallet()
      }
    }

    const handleChainChanged = () => {
      // Reload the page when chain changes to avoid issues
      window.location.reload()
    }

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [address])

  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error('Please install MetaMask or another wallet')
    }

    setIsConnecting(true)
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()

      // Check if on Sonic network (chainId 146)
      const isCorrect = network.chainId === 146n
      
      setProvider(provider)
      setSigner(signer)
      setAddress(address)
      setIsCorrectNetwork(isCorrect)

      console.log(`🔗 Wallet connected: ${address}`)
      console.log(`🌐 Network: ${network.name} (${network.chainId})`)

      if (!isCorrect) {
        console.warn('⚠️ Not on Sonic network')
      }

      return { address, provider, signer, isCorrectNetwork: isCorrect }
    } catch (error) {
      console.error('Wallet connection failed:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setAddress('')
    setProvider(null)
    setSigner(null)
    setIsCorrectNetwork(false)
    console.log('🔌 Wallet disconnected')
  }

  const switchToSonicNetwork = async () => {
    if (!window.ethereum) return false

    try {
      // Try to switch to Sonic network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x92' }], // 146 in hex
      })
      return true
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x92', // 146 in hex
                chainName: 'Sonic Network',
                nativeCurrency: {
                  name: 'Sonic',
                  symbol: 'S',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.soniclabs.com/'],
                blockExplorerUrls: ['https://sonicscan.org/'],
              },
            ],
          })
          return true
        } catch (addError) {
          console.error('Failed to add Sonic network:', addError)
          return false
        }
      }
      console.error('Failed to switch to Sonic network:', switchError)
      return false
    }
  }

  const value = {
    address,
    provider,
    signer,
    isConnecting,
    isCorrectNetwork,
    connectWallet,
    disconnect,
    switchToSonicNetwork,
    isConnected: !!address
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}