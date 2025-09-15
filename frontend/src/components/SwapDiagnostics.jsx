import React, { useState } from 'react'
import { ethers } from 'ethers'

const SWAP_POOL_ADDRESS = '0x399a73dFa0a362441b7067413224E5765D168dD0'
const STONER_FEE_POOL_ADDRESS = '0xF589111A4Af712142E68ce917751a4BFB8966dEe'

const SWAP_POOL_ABI = [
  'function getPoolInfo() view returns (address nftCollection, address receiptContract, address stonerPool, uint256 swapFeeInWei, uint256 stonerShare, uint256 poolSize, uint256 totalStaked)',
  'function stonerShare() view returns (uint256)',
  'function stonerPool() view returns (address)',
  'function swapFeeInWei() view returns (uint256)'
]

const STONER_FEE_POOL_ABI = [
  'function totalStaked() view returns (uint256)',
  'function paused() view returns (bool)',
  'function owner() view returns (address)',
  'function getPoolInfo() view returns (address nftAddress, uint256 totalStakedTokens, uint256 totalRewards, uint256 contractBalance)',
  'function notifyNativeReward() payable'
]

export default function SwapDiagnostics() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    setResults(null)

    try {
      if (!window.ethereum) {
        setResults('❌ No wallet detected')
        return
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const userAddress = await signer.getAddress()

      const diagnostics = {
        userAddress,
        swapPool: {},
        stonerFeePool: {},
        transferTest: {},
        gasEstimates: {}
      }

      // Check SwapPool configuration
      const swapPool = new ethers.Contract(SWAP_POOL_ADDRESS, SWAP_POOL_ABI, provider)
      const poolInfo = await swapPool.getPoolInfo()
      
      diagnostics.swapPool = {
        address: SWAP_POOL_ADDRESS,
        nftCollection: poolInfo[0],
        receiptContract: poolInfo[1],
        configuredStonerPool: poolInfo[2],
        swapFeeInWei: ethers.formatEther(poolInfo[3]),
        stonerShare: Number(poolInfo[4]),
        poolSize: Number(poolInfo[5]),
        totalStaked: Number(poolInfo[6]),
        stonerPoolMatches: poolInfo[2].toLowerCase() === STONER_FEE_POOL_ADDRESS.toLowerCase()
      }

      // Check StonerFeePool status
      const stonerFeePool = new ethers.Contract(STONER_FEE_POOL_ADDRESS, STONER_FEE_POOL_ABI, provider)
      const stonerPoolInfo = await stonerFeePool.getPoolInfo()
      const totalStaked = await stonerFeePool.totalStaked()
      const isPaused = await stonerFeePool.paused()
      const owner = await stonerFeePool.owner()
      
      diagnostics.stonerFeePool = {
        address: STONER_FEE_POOL_ADDRESS,
        totalStaked: Number(totalStaked),
        isPaused,
        owner,
        contractBalance: ethers.formatEther(stonerPoolInfo[3]),
        canReceiveRewards: Number(totalStaked) > 0 && !isPaused
      }

      // Test direct ETH transfer to StonerFeePool
      try {
        const testAmount = ethers.parseEther('0.001') // 0.001 ETH
        const gasEstimate = await stonerFeePool.notifyNativeReward.estimateGas({ value: testAmount })
        diagnostics.transferTest = {
          success: true,
          gasEstimate: Number(gasEstimate),
          testAmount: '0.001 ETH'
        }
      } catch (error) {
        diagnostics.transferTest = {
          success: false,
          error: error.message,
          reason: error.reason || 'Unknown'
        }
      }

      // Calculate expected fee split for a swap
      if (diagnostics.swapPool.stonerShare > 0) {
        const swapFee = ethers.parseEther(diagnostics.swapPool.swapFeeInWei)
        const stonerAmount = (swapFee * BigInt(diagnostics.swapPool.stonerShare)) / BigInt(100)
        diagnostics.gasEstimates = {
          swapFee: diagnostics.swapPool.swapFeeInWei,
          stonerAmount: ethers.formatEther(stonerAmount),
          rewardsAmount: ethers.formatEther(swapFee - stonerAmount)
        }
      }

      setResults(diagnostics)

    } catch (error) {
      setResults(`❌ Error during diagnostics: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testDirectTransfer = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const stonerFeePool = new ethers.Contract(STONER_FEE_POOL_ADDRESS, STONER_FEE_POOL_ABI, signer)
      
      console.log('Testing direct transfer to StonerFeePool...')
      const tx = await stonerFeePool.notifyNativeReward({ value: ethers.parseEther('0.001') })
      await tx.wait()
      console.log('✅ Direct transfer successful!')
      alert('✅ Direct transfer to StonerFeePool successful! The issue might be elsewhere.')
    } catch (error) {
      console.error('❌ Direct transfer failed:', error)
      alert(`❌ Direct transfer failed: ${error.reason || error.message}`)
    }
  }

  return (
    <div className="p-6 bg-red-100 dark:bg-red-900/20 rounded-xl border border-red-300 dark:border-red-700 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-red-700 dark:text-red-300 text-lg">🔍 Swap Diagnostics</h3>
        <div className="flex gap-2">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50 hover:bg-red-700 transition-colors"
          >
            {loading ? 'Checking...' : 'Run Diagnostics'}
          </button>
          {results && typeof results === 'object' && results.stonerFeePool?.canReceiveRewards && (
            <button
              onClick={testDirectTransfer}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
            >
              Test Direct Transfer
            </button>
          )}
        </div>
      </div>

      {results && (
        <div className="space-y-4 text-sm">
          {typeof results === 'string' ? (
            <p className="text-red-600 dark:text-red-400">{results}</p>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                <h4 className="font-semibold mb-2">SwapPool Configuration:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span>Configured Stoner Pool:</span>
                  <span className={results.swapPool.stonerPoolMatches ? 'text-green-600' : 'text-red-600'}>
                    {results.swapPool.configuredStonerPool} {results.swapPool.stonerPoolMatches ? '✅' : '❌'}
                  </span>
                  <span>Stoner Share:</span>
                  <span>{results.swapPool.stonerShare}%</span>
                  <span>Swap Fee:</span>
                  <span>{results.swapPool.swapFeeInWei} ETH</span>
                  <span>Pool Size:</span>
                  <span>{results.swapPool.poolSize} NFTs</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                <h4 className="font-semibold mb-2">StonerFeePool Status:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span>Total Staked:</span>
                  <span className={results.stonerFeePool.totalStaked > 0 ? 'text-green-600' : 'text-red-600'}>
                    {results.stonerFeePool.totalStaked} NFTs {results.stonerFeePool.totalStaked > 0 ? '✅' : '❌'}
                  </span>
                  <span>Is Paused:</span>
                  <span className={!results.stonerFeePool.isPaused ? 'text-green-600' : 'text-red-600'}>
                    {results.stonerFeePool.isPaused ? 'YES ❌' : 'NO ✅'}
                  </span>
                  <span>Can Receive:</span>
                  <span className={results.stonerFeePool.canReceiveRewards ? 'text-green-600' : 'text-red-600'}>
                    {results.stonerFeePool.canReceiveRewards ? 'YES ✅' : 'NO ❌'}
                  </span>
                  <span>Balance:</span>
                  <span>{results.stonerFeePool.contractBalance} ETH</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                <h4 className="font-semibold mb-2">Transfer Test:</h4>
                <div className="text-xs">
                  {results.transferTest.success ? (
                    <p className="text-green-600">✅ Can send ETH to StonerFeePool (Gas: {results.transferTest.gasEstimate})</p>
                  ) : (
                    <div>
                      <p className="text-red-600">❌ Cannot send ETH to StonerFeePool</p>
                      <p className="text-red-600 mt-1">Error: {results.transferTest.reason}</p>
                      <p className="text-gray-600 mt-1 text-xs">{results.transferTest.error}</p>
                    </div>
                  )}
                </div>
              </div>

              {results.gasEstimates.swapFee && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                  <h4 className="font-semibold mb-2">Expected Fee Split:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>Total Swap Fee:</span>
                    <span>{results.gasEstimates.swapFee} ETH</span>
                    <span>To Stoner Pool:</span>
                    <span>{results.gasEstimates.stonerAmount} ETH</span>
                    <span>To Rewards:</span>
                    <span>{results.gasEstimates.rewardsAmount} ETH</span>
                  </div>
                </div>
              )}

              <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded border border-yellow-400">
                <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">Recommendations:</h4>
                <div className="text-xs space-y-1">
                  {!results.swapPool.stonerPoolMatches && (
                    <p className="text-red-600">❌ SwapPool is configured with wrong StonerPool address!</p>
                  )}
                  {results.stonerFeePool.isPaused && (
                    <p className="text-red-600">❌ StonerFeePool is paused - needs to be unpaused by owner</p>
                  )}
                  {results.stonerFeePool.totalStaked === 0 && (
                    <p className="text-orange-600">⚠️ No NFTs staked in StonerFeePool - stake at least 1 NFT</p>
                  )}
                  {!results.transferTest.success && (
                    <p className="text-red-600">❌ Direct ETH transfer to StonerFeePool fails: {results.transferTest.reason}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}