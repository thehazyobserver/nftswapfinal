import React, { useState, useEffect } from 'react'
import NFTTokenImage from './NFTTokenImage'
import NFTLoadingSkeleton from './NFTLoadingSkeleton'
import ApproveNFTButton from './ApproveNFTButton'
import { useToast } from './ToastProvider'
import { useBlockchainTransaction } from './useTransactionState'

export default function StakingInterface({ 
  walletNFTs, 
  receiptNFTs,
  stakedNFTs,
  loading, 
  receiptLoading,
  onStake, 
  onUnstake,
  onClaimRewards,
  status,
  approvedMap,
  isApprovedForAll,
  onApproveAll,
  approvingAll,
  nftCollection,
  swapPool,
  provider,
  pendingRewards = '0',
  stakerShare = null,
  swapFee = null
}) {
  // Debug logging for props
  console.log(`🖼️ StakingInterface received props:`, {
    walletNFTs: walletNFTs?.length || 0,
    receiptNFTs: receiptNFTs?.length || 0,
    stakedNFTs: stakedNFTs?.length || 0,
    receiptLoading,
    pendingRewards
  })
  const [selectedWalletTokens, setSelectedWalletTokens] = useState([])
  const [selectedReceiptTokens, setSelectedReceiptTokens] = useState([])
  const toast = useToast()
  const { executeTransaction, isTransactionPending } = useBlockchainTransaction()

  const handleStake = async () => {
    if (selectedWalletTokens.length === 0) {
      toast.error('Please select NFTs to stake')
      return
    }

    try {
      await executeTransaction(
        'stake',
        () => onStake(selectedWalletTokens),
        {
          pendingMessage: `Staking ${selectedWalletTokens.length} NFT${selectedWalletTokens.length > 1 ? 's' : ''}...`,
          successMessage: `Successfully staked ${selectedWalletTokens.length} NFT${selectedWalletTokens.length > 1 ? 's' : ''}!`,
          onSuccess: () => {
            setSelectedWalletTokens([]) // Clear selection after successful stake
          }
        }
      )
    } catch (error) {
      // Error is already handled by executeTransaction
    }
  }

  const handleUnstake = async () => {
    if (selectedReceiptTokens.length === 0) {
      toast.error('Please select staked NFTs to unstake')
      return
    }

    try {
      await executeTransaction(
        'unstake',
        () => onUnstake(selectedReceiptTokens),
        {
          pendingMessage: `Unstaking ${selectedReceiptTokens.length} NFT${selectedReceiptTokens.length > 1 ? 's' : ''}...`,
          successMessage: `Successfully unstaked ${selectedReceiptTokens.length} NFT${selectedReceiptTokens.length > 1 ? 's' : ''}!`,
          onSuccess: () => {
            setSelectedReceiptTokens([]) // Clear selection after successful unstake
          }
        }
      )
    } catch (error) {
      // Error is already handled by executeTransaction
    }
  }

  const handleClaimRewards = async () => {
    if (pendingRewards === '0' || pendingRewards === '0.0') {
      toast.info('No rewards to claim at the moment')
      return
    }

    try {
      await executeTransaction(
        'claim',
        () => onClaimRewards(),
        {
          pendingMessage: 'Claiming rewards...',
          successMessage: `Successfully claimed ${pendingRewards} S tokens!`,
        }
      )
    } catch (error) {
      // Error is already handled by executeTransaction
    }
  }

  const allSelected = selectedWalletTokens.length > 0 && selectedWalletTokens.every(tokenId => approvedMap[tokenId] || isApprovedForAll)
  
  const isStaking = isTransactionPending('stake')
  const isUnstaking = isTransactionPending('unstake')
  const isClaiming = isTransactionPending('claim')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Stake Your NFTs
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Stake NFTs to earn rewards and contribute to the swap pool
            </p>
          </div>
        </div>
      </div>

      {/* Rewards Section */}
      {stakedNFTs.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">💰</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                  Staking Rewards
                </h3>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Earn from swap fees and trading activity
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">
                {parseFloat(pendingRewards).toFixed(4)} S
              </div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">
                Pending Rewards
              </div>
            </div>
          </div>
          
          <div className="bg-black/20 rounded-lg p-4 border border-yellow-600/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <span className="text-yellow-400 text-sm">💎</span>
                </div>
                <div>
                  <div className="font-semibold text-yellow-200">Swap Fee Earnings</div>
                  <div className="text-xs text-yellow-300/70">From your staked NFTs generating trading fees</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-yellow-200">
                  {stakedNFTs.length} NFT{stakedNFTs.length !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-yellow-300/70">Currently Staked</div>
              </div>
            </div>
            
            {/* Fee Split Information */}
            {stakerShare !== null && swapFee !== null && (
              <div className="mb-3 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 text-sm">📊</span>
                    <div>
                      <div className="text-sm font-medium text-blue-200">Staker Fee Share</div>
                      <div className="text-xs text-blue-300/70">Of each {swapFee} S swap fee</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-200">
                      {stakerShare}%
                    </div>
                    <div className="text-xs text-blue-300/70">Goes to Stakers</div>
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={handleClaimRewards}
              disabled={isClaiming || parseFloat(pendingRewards) === 0}
              className={`w-full px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                isClaiming 
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-400 animate-pulse-glow' 
                  : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600'
              }`}
            >
              {isClaiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="loading-dots">Claiming</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15V3m0 12l-4-4m4 4l4-4m5 4v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6m14-4V5a2 2 0 00-2-2H9a2 2 0 00-2 2v6m10 0V9a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                  </svg>
                  {parseFloat(pendingRewards) > 0 ? `Claim ${parseFloat(pendingRewards).toFixed(4)} S` : 'No Rewards Available'}
                </>
              )}
            </button>
          </div>
          
          {parseFloat(pendingRewards) === 0 && stakedNFTs.length > 0 && (
            <div className="text-center">
              <div className="text-xs text-yellow-300/60 bg-yellow-900/30 px-3 py-2 rounded-lg border border-yellow-700/30">
                💡 <strong>Tip:</strong> Rewards accumulate as users swap NFTs in this pool. Check back later!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selection Summary */}
      <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected to Stake:
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedWalletTokens.length > 0 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-300'
            }`}>
              {selectedWalletTokens.length} NFTs
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected to Unstake:
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedReceiptTokens.length > 0 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-300'
            }`}>
              {selectedReceiptTokens.length} NFTs
            </div>
          </div>
        </div>
      </div>

      {/* Approval Section */}
      {walletNFTs.length > 0 && !isApprovedForAll && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">Approval Required</h4>
                <p className="text-sm text-blue-600 dark:text-blue-400">Approve all NFTs for easier staking</p>
              </div>
            </div>
            <button
              onClick={onApproveAll}
              disabled={approvingAll}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {approvingAll ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Approving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve All
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Your NFTs Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Available to Stake ({walletNFTs.length})
          </h3>
        </div>

        <div className="min-h-[120px] bg-white/75 dark:bg-gray-800/75 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          {loading ? (
            <NFTLoadingSkeleton count={6} size={64} />
          ) : walletNFTs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🖼️</div>
              <p className="text-gray-500 dark:text-gray-400">No NFTs available to stake</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {walletNFTs.map(nft => (
                <div key={nft.tokenId} className="relative">
                  <button 
                    className={`relative border-2 rounded-xl p-2 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm transition-all duration-200 w-full ${
                      selectedWalletTokens.includes(nft.tokenId) 
                        ? 'border-green-400 scale-105 ring-2 ring-green-400/50 shadow-lg' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 hover:shadow-md'
                    }`} 
                    onClick={() => {
                      if (selectedWalletTokens.includes(nft.tokenId)) {
                        setSelectedWalletTokens(prev => prev.filter(id => id !== nft.tokenId))
                      } else {
                        setSelectedWalletTokens(prev => [...prev, nft.tokenId])
                      }
                    }}
                    disabled={loading}
                  >
                    <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={64} />
                    <div className="text-xs text-center mt-2 font-mono text-gray-600 dark:text-gray-400">
                      #{nft.tokenId}
                    </div>
                    {selectedWalletTokens.includes(nft.tokenId) && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                  
                  {/* Approval Button */}
                  {!isApprovedForAll && !approvedMap[nft.tokenId] && selectedWalletTokens.includes(nft.tokenId) && (
                    <div className="mt-2">
                      <ApproveNFTButton
                        nftAddress={nftCollection}
                        tokenId={nft.tokenId}
                        spender={swapPool}
                        provider={provider}
                        disabled={loading}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staked NFTs Section */}
      {console.log(`🧪 Checking receiptNFTs for render:`, receiptNFTs, receiptNFTs?.length, receiptNFTs?.length > 0)}
      {receiptNFTs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Currently Staked ({receiptNFTs.length})
            </h3>
          </div>

          <div className="min-h-[120px] bg-white/75 dark:bg-gray-800/75 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            {receiptLoading ? (
              <NFTLoadingSkeleton count={6} size={64} />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {receiptNFTs.map(nft => (
                  <button 
                    key={nft.tokenId} 
                    className={`relative border-2 rounded-xl p-2 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 shadow-sm transition-all duration-200 ${
                      selectedReceiptTokens.includes(nft.tokenId) 
                        ? 'border-red-400 scale-105 ring-2 ring-red-400/50 shadow-lg' 
                        : 'border-yellow-200 dark:border-yellow-700 hover:border-red-300 hover:shadow-md'
                    }`} 
                    onClick={() => {
                      if (selectedReceiptTokens.includes(nft.tokenId)) {
                        setSelectedReceiptTokens(prev => prev.filter(id => id !== nft.tokenId))
                      } else {
                        setSelectedReceiptTokens(prev => [...prev, nft.tokenId])
                      }
                    }}
                    disabled={loading}
                  >
                    <NFTTokenImage 
                      image={nft.image} 
                      tokenId={nft.tokenId} 
                      size={64} 
                      isReceiptToken={nft.isReceiptToken}
                      poolSlotId={nft.poolSlotId}
                      name={nft.name}
                    />
                    <div className="text-xs text-center mt-2 font-mono text-yellow-700 dark:text-yellow-300">
                      #{nft.tokenId}
                    </div>
                    {selectedReceiptTokens.includes(nft.tokenId) && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -left-1 bg-yellow-500 text-white text-xs px-1 py-0.5 rounded text-[10px] font-bold">
                      STAKED
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        <div className="space-y-3">
          <button 
            className={`w-full px-6 py-4 text-white rounded-xl shadow-lg font-semibold text-lg tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
              selectedWalletTokens.length === 0 || !allSelected
                ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed' 
                : isStaking 
                ? 'bg-gradient-to-r from-green-400 to-emerald-400 animate-pulse-glow' 
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:shadow-xl hover:scale-105'
            }`}
            onClick={handleStake} 
            disabled={isStaking || selectedWalletTokens.length === 0 || !allSelected}
          >
            {isStaking ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="loading-dots">Staking</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Stake Selected ({selectedWalletTokens.length})
              </>
            )}
          </button>
          
          {selectedWalletTokens.length > 0 && (
            <button 
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2" 
              onClick={() => setSelectedWalletTokens([])}
              disabled={loading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Selection
            </button>
          )}
        </div>

        <div className="space-y-3">
          <button 
            className={`w-full px-6 py-4 text-white rounded-xl shadow-lg font-semibold text-lg tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
              selectedReceiptTokens.length === 0
                ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed' 
                : isUnstaking 
                ? 'bg-gradient-to-r from-red-400 to-pink-400 animate-pulse-glow' 
                : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 hover:shadow-xl hover:scale-105'
            }`}
            onClick={handleUnstake} 
            disabled={isUnstaking || selectedReceiptTokens.length === 0}
          >
            {isUnstaking ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="loading-dots">Unstaking</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Unstake Selected ({selectedReceiptTokens.length})
              </>
            )}
          </button>
          
          {selectedReceiptTokens.length > 0 && (
            <button 
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2" 
              onClick={() => setSelectedReceiptTokens([])}
              disabled={loading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Status Message */}
      {status && (
        <div className={`p-4 rounded-xl border transition-all duration-300 ${
          status.includes('successful') || status.includes('claimed') || status.includes('Stake successful') || status.includes('Unstake successful') || status.includes('Rewards claimed')
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : status.includes('failed') || status.includes('error') || status.includes('❌') || status.includes('Cannot')
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            : status.includes('Staking...') || status.includes('Unstaking...') || status.includes('Claiming')
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {status.includes('successful') || status.includes('claimed') || status.includes('Stake successful') || status.includes('Unstake successful') || status.includes('Rewards claimed') ? (
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : status.includes('failed') || status.includes('error') || status.includes('❌') || status.includes('Cannot') ? (
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : status.includes('Staking...') || status.includes('Unstaking...') || status.includes('Claiming') ? (
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
              {(status.includes('Staking...') || status.includes('Unstaking...') || status.includes('Claiming')) && (
                <div className="text-xs opacity-75 mt-1">This may take a few moments to complete...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}