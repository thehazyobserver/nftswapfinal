import { useState, useEffect } from 'react'
import { useToast } from './ToastProvider'

export function useTransactionState() {
  const [txStates, setTxStates] = useState({}) // { [key]: { status, txHash, startTime } }
  const toast = useToast()

  const startTransaction = (key, message = 'Transaction pending...') => {
    const toastId = toast.loading(message)
    
    setTxStates(prev => ({
      ...prev,
      [key]: {
        status: 'pending',
        message,
        toastId,
        startTime: Date.now()
      }
    }))
  }

  const updateTransaction = (key, txHash, message) => {
    setTxStates(prev => {
      const current = prev[key]
      if (!current) return prev

      // Remove the loading toast
      toast.removeToast(current.toastId)
      
      // Add success toast with tx hash
      const newToastId = toast.success(message, txHash)

      return {
        ...prev,
        [key]: {
          ...current,
          status: 'success',
          txHash,
          message,
          toastId: newToastId
        }
      }
    })
  }

  const failTransaction = (key, error) => {
    setTxStates(prev => {
      const current = prev[key]
      if (!current) return prev

      // Remove the loading toast
      toast.removeToast(current.toastId)
      
      // Add error toast
      let errorMessage = 'Transaction failed'
      if (error?.message) {
        if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction cancelled by user'
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction'
        } else {
          errorMessage = error.message
        }
      }
      
      const newToastId = toast.error(errorMessage)

      return {
        ...prev,
        [key]: {
          ...current,
          status: 'failed',
          message: errorMessage,
          toastId: newToastId
        }
      }
    })
  }

  const clearTransaction = (key) => {
    setTxStates(prev => {
      const current = prev[key]
      if (current?.toastId) {
        toast.removeToast(current.toastId)
      }
      const { [key]: removed, ...rest } = prev
      return rest
    })
  }

  const isTransactionPending = (key) => {
    return txStates[key]?.status === 'pending'
  }

  const getTransactionState = (key) => {
    return txStates[key] || null
  }

  return {
    startTransaction,
    updateTransaction,
    failTransaction,
    clearTransaction,
    isTransactionPending,
    getTransactionState
  }
}

// Enhanced hook for specific blockchain operations
export function useBlockchainTransaction() {
  const transactionState = useTransactionState()
  const toast = useToast()

  const executeTransaction = async (key, transactionFn, config = {}) => {
    const {
      pendingMessage = 'Transaction pending...',
      successMessage = 'Transaction successful!',
      onSuccess,
      onError
    } = config

    try {
      transactionState.startTransaction(key, pendingMessage)
      
      const result = await transactionFn()
      
      // Handle different return types
      let txHash = null
      let message = successMessage

      if (result?.hash) {
        txHash = result.hash
        // Wait for confirmation
        if (result.wait) {
          const receipt = await result.wait()
          if (receipt.status === 0) {
            throw new Error('Transaction failed during execution')
          }
        }
      }

      transactionState.updateTransaction(key, txHash, message)
      
      if (onSuccess) {
        onSuccess(result)
      }

      return result
    } catch (error) {
      console.error(`Transaction ${key} failed:`, error)
      transactionState.failTransaction(key, error)
      
      if (onError) {
        onError(error)
      }
      
      throw error
    }
  }

  return {
    ...transactionState,
    executeTransaction
  }
}