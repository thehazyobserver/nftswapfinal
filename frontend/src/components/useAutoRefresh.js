import { useState, useEffect, useRef, useCallback } from 'react'
import { ethers } from 'ethers'

export function useAutoRefresh({
  provider,
  account,
  refreshInterval = 30000, // 30 seconds default
  onAccountChange,
  onNetworkChange,
  onBalanceChange,
  disabled = false
}) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const intervalRef = useRef()
  const previousAccountRef = useRef(account)
  const previousNetworkRef = useRef()
  const previousBalanceRef = useRef()

  const performRefresh = useCallback(async () => {
    if (!provider || !account || disabled) return

    try {
      setIsRefreshing(true)

      // Check network changes
      const network = await provider.getNetwork()
      if (previousNetworkRef.current && previousNetworkRef.current.chainId !== network.chainId) {
        onNetworkChange?.(network)
      }
      previousNetworkRef.current = network

      // Check balance changes
      const balance = await provider.getBalance(account)
      if (previousBalanceRef.current && !previousBalanceRef.current.eq(balance)) {
        onBalanceChange?.(balance)
      }
      previousBalanceRef.current = balance

      setLastRefresh(Date.now())
    } catch (error) {
      console.error('Auto refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [provider, account, disabled, onNetworkChange, onBalanceChange])

  // Handle account changes
  useEffect(() => {
    if (previousAccountRef.current !== account) {
      onAccountChange?.(account)
      previousAccountRef.current = account
      
      // Immediate refresh on account change
      if (account) {
        performRefresh()
      }
    }
  }, [account, onAccountChange, performRefresh])

  // Set up automatic refresh interval
  useEffect(() => {
    if (disabled || !provider || !account) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    // Initial refresh
    performRefresh()

    // Set up interval
    intervalRef.current = setInterval(performRefresh, refreshInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [provider, account, refreshInterval, disabled, performRefresh])

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    await performRefresh()
  }, [performRefresh])

  return {
    isRefreshing,
    lastRefresh,
    manualRefresh
  }
}

export function useWalletListener() {
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!window.ethereum) return

    // Check if already connected
    const checkConnection = async () => {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setIsConnected(true)
          
          const chainId = await window.ethereum.request({ method: 'eth_chainId' })
          setChainId(parseInt(chainId, 16))
        }
      } catch (error) {
        console.error('Failed to check connection:', error)
      }
    }

    // Set up event listeners
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null)
        setIsConnected(false)
      } else {
        setAccount(accounts[0])
        setIsConnected(true)
      }
    }

    const handleChainChanged = (chainId) => {
      setChainId(parseInt(chainId, 16))
      // Reload the page as recommended by MetaMask
      window.location.reload()
    }

    const handleConnect = (connectInfo) => {
      setChainId(parseInt(connectInfo.chainId, 16))
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      setAccount(null)
      setIsConnected(false)
      setChainId(null)
    }

    // Add listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
    window.ethereum.on('connect', handleConnect)
    window.ethereum.on('disconnect', handleDisconnect)

    // Check initial connection
    checkConnection()

    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
        window.ethereum.removeListener('connect', handleConnect)
        window.ethereum.removeListener('disconnect', handleDisconnect)
      }
    }
  }, [])

  return { account, chainId, isConnected }
}

export function useSmartPolling({
  fetchFunction,
  interval = 15000,
  enabled = true,
  dependencies = []
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef()
  const mountedRef = useRef(true)

  const executeRefresh = useCallback(async () => {
    if (!enabled || !fetchFunction) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await fetchFunction()
      
      if (mountedRef.current) {
        setData(result)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err)
        console.error('Smart polling fetch failed:', err)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [fetchFunction, enabled])

  // Effect for polling
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    // Initial fetch
    executeRefresh()

    // Set up polling
    intervalRef.current = setInterval(executeRefresh, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [executeRefresh, interval, enabled, ...dependencies])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const manualRefresh = useCallback(() => {
    executeRefresh()
  }, [executeRefresh])

  return {
    data,
    loading,
    error,
    refresh: manualRefresh
  }
}

export function useBatchedRequests() {
  const [queue, setQueue] = useState([])
  const [results, setResults] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)
  const timeoutRef = useRef()

  const addRequest = useCallback((id, requestFn, priority = 0) => {
    setQueue(prev => {
      const existing = prev.find(item => item.id === id)
      if (existing) return prev // Don't duplicate requests
      
      const newQueue = [...prev, { id, requestFn, priority, timestamp: Date.now() }]
      // Sort by priority (higher first) then by timestamp
      return newQueue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp)
    })

    // Debounce execution
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      processQueue()
    }, 100) // 100ms debounce
  }, [])

  const processQueue = useCallback(async () => {
    if (queue.length === 0 || isProcessing) return

    setIsProcessing(true)
    const currentQueue = [...queue]
    setQueue([])

    try {
      // Process requests in batches of 5 to avoid overwhelming the RPC
      const batchSize = 5
      for (let i = 0; i < currentQueue.length; i += batchSize) {
        const batch = currentQueue.slice(i, i + batchSize)
        
        const batchResults = await Promise.allSettled(
          batch.map(async ({ id, requestFn }) => {
            try {
              const result = await requestFn()
              return { id, result, status: 'fulfilled' }
            } catch (error) {
              return { id, error, status: 'rejected' }
            }
          })
        )

        // Update results
        setResults(prev => {
          const updated = { ...prev }
          batchResults.forEach(({ value }) => {
            if (value) {
              updated[value.id] = value
            }
          })
          return updated
        })

        // Small delay between batches to be nice to the RPC
        if (i + batchSize < currentQueue.length) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
    } catch (error) {
      console.error('Batch processing failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [queue, isProcessing])

  const getResult = useCallback((id) => {
    return results[id]
  }, [results])

  const clearResults = useCallback(() => {
    setResults({})
  }, [])

  return {
    addRequest,
    getResult,
    clearResults,
    isProcessing,
    queueSize: queue.length
  }
}