import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWalletListener, useAutoRefresh } from './useAutoRefresh'
import { useToast } from './ToastProvider'

const AppStateContext = createContext()

const initialState = {
  // Wallet state
  account: null,
  provider: null,
  signer: null,
  chainId: null,
  isConnecting: false,
  isConnected: false,
  
  // Network state
  isCorrectNetwork: false,
  
  // Data state
  nftBalances: {},
  poolData: {},
  rewardBalances: {},
  
  // UI state
  refreshing: {},
  lastRefreshTime: Date.now(),
  
  // Settings
  autoRefreshEnabled: true,
  refreshInterval: 30000
}

function appStateReducer(state, action) {
  switch (action.type) {
    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload }
    
    case 'SET_WALLET':
      return {
        ...state,
        account: action.payload.account,
        provider: action.payload.provider,
        signer: action.payload.signer,
        chainId: action.payload.chainId,
        isConnected: !!action.payload.account,
        isConnecting: false
      }
    
    case 'SET_NETWORK_STATUS':
      return { ...state, isCorrectNetwork: action.payload }
    
    case 'UPDATE_NFT_BALANCE':
      return {
        ...state,
        nftBalances: {
          ...state.nftBalances,
          [action.payload.address]: action.payload.balance
        }
      }
    
    case 'UPDATE_POOL_DATA':
      return {
        ...state,
        poolData: {
          ...state.poolData,
          [action.payload.poolAddress]: action.payload.data
        }
      }
    
    case 'UPDATE_REWARD_BALANCE':
      return {
        ...state,
        rewardBalances: {
          ...state.rewardBalances,
          [action.payload.poolAddress]: action.payload.balance
        }
      }
    
    case 'SET_REFRESHING':
      return {
        ...state,
        refreshing: {
          ...state.refreshing,
          [action.payload.key]: action.payload.value
        }
      }
    
    case 'SET_LAST_REFRESH':
      return { ...state, lastRefreshTime: Date.now() }
    
    case 'TOGGLE_AUTO_REFRESH':
      return { ...state, autoRefreshEnabled: !state.autoRefreshEnabled }
    
    case 'SET_REFRESH_INTERVAL':
      return { ...state, refreshInterval: action.payload }
    
    case 'RESET_STATE':
      return {
        ...initialState,
        autoRefreshEnabled: state.autoRefreshEnabled,
        refreshInterval: state.refreshInterval
      }
    
    default:
      return state
  }
}

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState)
  const toast = useToast()
  
  // Listen to wallet changes
  const { account: walletAccount, chainId, isConnected } = useWalletListener()

  // Setup provider when account changes
  useEffect(() => {
    const setupProvider = async () => {
      try {
        if (walletAccount && window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const signer = await provider.getSigner()
          
          dispatch({
            type: 'SET_WALLET',
            payload: {
              account: walletAccount,
              provider,
              signer,
              chainId,
            }
          })
        } else {
          dispatch({ type: 'RESET_STATE' })
        }
      } catch (error) {
        console.error('Failed to setup provider:', error)
        toast.error('Failed to setup wallet connection')
      }
    }

    setupProvider()
  }, [walletAccount, chainId, toast])

  // Monitor network status
  useEffect(() => {
    const isCorrect = chainId === 146 // Sonic Network
    dispatch({ type: 'SET_NETWORK_STATUS', payload: isCorrect })
    
    if (chainId && chainId !== 146) {
      toast.error('Please switch to Sonic Network')
    }
  }, [chainId, toast])

  // Auto-refresh system
  const { isRefreshing } = useAutoRefresh({
    provider: state.provider,
    account: state.account,
    refreshInterval: state.refreshInterval,
    disabled: !state.autoRefreshEnabled || !state.isCorrectNetwork,
    onAccountChange: (newAccount) => {
      if (newAccount !== state.account) {
        dispatch({ type: 'RESET_STATE' })
        if (newAccount) {
          toast.info(`Connected to ${newAccount.slice(0, 6)}...${newAccount.slice(-4)}`)
        } else {
          toast.info('Wallet disconnected')
        }
      }
    },
    onNetworkChange: (network) => {
      toast.info(`Network changed to ${network.name}`)
      dispatch({ type: 'SET_LAST_REFRESH' })
    },
    onBalanceChange: (balance) => {
      toast.success('Balance updated')
      dispatch({ type: 'SET_LAST_REFRESH' })
    }
  })

  // Helper functions
  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('No wallet detected. Please install MetaMask.')
      return false
    }

    try {
      dispatch({ type: 'SET_CONNECTING', payload: true })
      
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length > 0) {
        toast.success('Wallet connected successfully!')
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      if (error.code === 4001) {
        toast.error('Connection rejected by user')
      } else {
        toast.error('Failed to connect wallet')
      }
      return false
    } finally {
      dispatch({ type: 'SET_CONNECTING', payload: false })
    }
  }

  const disconnectWallet = () => {
    dispatch({ type: 'RESET_STATE' })
    toast.info('Wallet disconnected')
  }

  const updateNFTBalance = (address, balance) => {
    dispatch({
      type: 'UPDATE_NFT_BALANCE',
      payload: { address, balance }
    })
  }

  const updatePoolData = (poolAddress, data) => {
    dispatch({
      type: 'UPDATE_POOL_DATA',
      payload: { poolAddress, data }
    })
  }

  const updateRewardBalance = (poolAddress, balance) => {
    dispatch({
      type: 'UPDATE_REWARD_BALANCE',
      payload: { poolAddress, balance }
    })
  }

  const setRefreshing = (key, value) => {
    dispatch({
      type: 'SET_REFRESHING',
      payload: { key, value }
    })
  }

  const toggleAutoRefresh = () => {
    dispatch({ type: 'TOGGLE_AUTO_REFRESH' })
    toast.info(`Auto-refresh ${!state.autoRefreshEnabled ? 'enabled' : 'disabled'}`)
  }

  const setRefreshInterval = (interval) => {
    dispatch({ type: 'SET_REFRESH_INTERVAL', payload: interval })
  }

  const value = {
    // State
    ...state,
    isRefreshing,
    
    // Actions
    connectWallet,
    disconnectWallet,
    updateNFTBalance,
    updatePoolData,
    updateRewardBalance,
    setRefreshing,
    toggleAutoRefresh,
    setRefreshInterval
  }

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}

export const useAppState = () => {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return context
}