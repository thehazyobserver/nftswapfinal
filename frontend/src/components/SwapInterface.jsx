import React, { useState, useEffect } from 'react'
import NFTTokenImage from './NFTTokenImage'
import NFTLoadingSkeleton from './NFTLoadingSkeleton'
import { useToast } from './ToastProvider'
import { useBlockchainTransaction } from './useTransactionState'

export default function SwapInterface({ 
  walletNFTs, 
  poolNFTs, 
  loading, 
  onSwap, 
  status,
  swapFee 
}) {
  const [selectedSwapTokens, setSelectedSwapTokens] = useState([])
  const toast = useToast()
  const { executeTransaction, isTransactionPending } = useBlockchainTransaction()

  const handleSwap = async () => {
    if (selectedSwapTokens.length === 0) {
      toast.error('Please select NFTs to swap')
      return
    }

    try {
      await executeTransaction(
        'swap',
        () => onSwap(selectedSwapTokens),
        {
          pendingMessage: `Swapping ${selectedSwapTokens.length} NFT${selectedSwapTokens.length > 1 ? 's' : ''}...`,
          successMessage: `Successfully swapped ${selectedSwapTokens.length} NFT${selectedSwapTokens.length > 1 ? 's' : ''}!`,
          onSuccess: () => {
            setSelectedSwapTokens([]) // Clear selection after successful swap
          },
          onError: (error) => {
            console.error('Swap failed:', error)
          }
        }
      )
    } catch (error) {
      // Error is already handled by executeTransaction
    }
  }

  const isSwapping = isTransactionPending('swap')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 1H4m0 0l4 4M4 12l4-4" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Swap Your NFTs
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Exchange your NFTs with those available in the pool
            </p>
          </div>
        </div>
      </div>

      {/* Selection Summary */}
      <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected for Swap:
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedSwapTokens.length > 8 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300' 
                : selectedSwapTokens.length > 0 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-300'
            }`}>
              {selectedSwapTokens.length}/10 NFTs
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            📦 Max 10 NFTs per batch
          </div>
        </div>
      </div>

      {/* Your NFTs Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Your NFTs ({walletNFTs.length})
          </h3>
        </div>

        <div className="min-h-[120px] bg-white/75 dark:bg-gray-800/75 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          {loading ? (
            <NFTLoadingSkeleton count={6} size={64} />
          ) : walletNFTs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🖼️</div>
              <p className="text-gray-500 dark:text-gray-400">No NFTs found in your wallet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {walletNFTs.map(nft => (
                <button 
                  key={nft.tokenId} 
                  className={`relative border-2 rounded-xl p-2 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm transition-all duration-200 ${
                    selectedSwapTokens.includes(nft.tokenId) 
                      ? 'border-blue-400 scale-105 ring-2 ring-blue-400/50 shadow-lg' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md'
                  } ${selectedSwapTokens.length >= 10 && !selectedSwapTokens.includes(nft.tokenId) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} 
                  onClick={() => {
                    if (selectedSwapTokens.includes(nft.tokenId)) {
                      setSelectedSwapTokens(prev => prev.filter(id => id !== nft.tokenId))
                    } else if (selectedSwapTokens.length < 10) {
                      setSelectedSwapTokens(prev => [...prev, nft.tokenId])
                    }
                  }}
                  disabled={loading || (selectedSwapTokens.length >= 10 && !selectedSwapTokens.includes(nft.tokenId))}
                >
                  <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={64} />
                  <div className="text-xs text-center mt-2 font-mono text-gray-600 dark:text-gray-400">
                    #{nft.tokenId}
                  </div>
                  {selectedSwapTokens.includes(nft.tokenId) && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pool NFTs Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Available in Pool ({poolNFTs.length})
          </h3>
        </div>

        <div className="min-h-[120px] bg-white/75 dark:bg-gray-800/75 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          {loading ? (
            <NFTLoadingSkeleton count={6} size={64} />
          ) : poolNFTs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🏊‍♂️</div>
              <p className="text-gray-500 dark:text-gray-400">Pool is empty - stake NFTs first to enable swapping</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {poolNFTs.map(nft => (
                <div 
                  key={nft.tokenId} 
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm"
                >
                  <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={64} />
                  <div className="text-xs text-center mt-2 font-mono text-gray-600 dark:text-gray-400">
                    #{nft.tokenId}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Total Fee Display */}
      {selectedSwapTokens.length > 0 && swapFee && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-800/50 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Swap Cost: {selectedSwapTokens.length} NFT{selectedSwapTokens.length > 1 ? 's' : ''} × {swapFee} S = {(parseFloat(swapFee) * selectedSwapTokens.length).toFixed(4)} S
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Total fee for swapping {selectedSwapTokens.length} NFT{selectedSwapTokens.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-4 pt-4">
        <button 
          className={`flex-1 px-6 py-4 text-white rounded-xl shadow-lg font-semibold text-lg tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
            poolNFTs.length === 0 
              ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed' 
              : isSwapping 
              ? 'bg-gradient-to-r from-blue-400 to-indigo-400 animate-pulse-glow' 
              : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 hover:shadow-xl hover:scale-105'
          }`}
          onClick={handleSwap} 
          disabled={isSwapping || selectedSwapTokens.length === 0 || poolNFTs.length === 0}
          title={poolNFTs.length === 0 ? 'Pool is empty - stake NFTs first to enable swapping' : ''}
        >
          {isSwapping ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="loading-dots">Swapping</span>
            </>
          ) : poolNFTs.length === 0 ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Pool Empty - Stake NFTs First
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 1H4m0 0l4 4M4 12l4-4" />
              </svg>
              {swapFee ? 
                `Swap ${selectedSwapTokens.length} NFT${selectedSwapTokens.length > 1 ? 's' : ''} (${(parseFloat(swapFee) * selectedSwapTokens.length).toFixed(4)} S)` :
                `Swap Selected NFTs (${selectedSwapTokens.length})`
              }
            </>
          )}
        </button>
        
        {selectedSwapTokens.length > 0 && !isSwapping && (
          <button 
            className="px-4 py-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2" 
            onClick={() => setSelectedSwapTokens([])}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Status Message */}
      {status && (
        <div className={`p-4 rounded-xl border transition-all duration-300 ${
          status.includes('successful') || status.includes('Swap successful')
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : status.includes('failed') || status.includes('error') || status.includes('❌')
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            : status.includes('Swapping')
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {status.includes('successful') || status.includes('Swap successful') ? (
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : status.includes('failed') || status.includes('error') || status.includes('❌') ? (
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : status.includes('Swapping') ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm leading-5">{status}</div>
              {status.includes('Swapping') && (
                <div className="text-xs opacity-75 mt-1">This may take a few moments to complete...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}