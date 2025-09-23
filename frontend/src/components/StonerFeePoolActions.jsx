import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import StonerFeePoolABI from '../abis/StonerFeePool.json'
import StakeReceiptABI from '../abis/StakeReceipt.json'
import NFTTokenImage from './NFTTokenImage'
import StonerNFTABI from '../abis/StonerNFT.json'
import contractAddresses from '../../public/contracts.json'

const STONER_FEE_POOL_ADDRESS = contractAddresses.stonerFeePool
const STONER_STAKE_RECEIPT_ADDRESS = contractAddresses.stonerStakeReceipt
const STONER_NFT_ADDRESS = '0x9b567e03d891F537b2B7874aA4A3308Cfe2F4FBb'

export default function StonerFeePoolActions() {
  console.log('🎯 StonerFeePoolActions component loaded!')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletNFTs, setWalletNFTs] = useState([])
  const [stakedNFTs, setStakedNFTs] = useState([])
  const [selectedTokens, setSelectedTokens] = useState([])
  const [selectedStakedTokens, setSelectedStakedTokens] = useState([])
  const [isApprovedForAll, setIsApprovedForAll] = useState(false)
  
  // Wallet connection state
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [connectingWallet, setConnectingWallet] = useState(false)
  
  // Rewards state
  const [nativeRewards, setNativeRewards] = useState('0')
  const [erc20Rewards, setErc20Rewards] = useState([])
  const [whitelistedTokens, setWhitelistedTokens] = useState([])
  const [rewardsLoading, setRewardsLoading] = useState(false)

  // Check wallet connection status
  const checkWalletConnection = async () => {
    if (!window.ethereum) return false
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
        setIsWalletConnected(true)
        return true
      }
    } catch (e) {
      console.warn('Failed to check wallet connection:', e.message)
    }
    
    return false
  }

  // Connect wallet explicitly
  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus('Please install MetaMask or another wallet')
      return false
    }
    
    setConnectingWallet(true)
    setStatus('')
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
        setIsWalletConnected(true)
        setStatus('Wallet connected successfully!')
        return true
      }
    } catch (e) {
      if (e.code === 4001) {
        setStatus('Wallet connection rejected by user')
      } else {
        setStatus('Failed to connect wallet: ' + e.message)
      }
      console.warn('Wallet connection failed:', e.message)
    } finally {
      setConnectingWallet(false)
    }
    
    return false
  }

  const getSigner = async () => {
    if (!window.ethereum) throw new Error('Wallet not found')
    const provider = new ethers.BrowserProvider(window.ethereum)
    return provider.getSigner()
  }

  // Fetch NFTs function (separate for refresh capability)
  const fetchNFTs = async () => {
    console.log('🎯 fetchNFTs called in StonerFeePoolActions')
    if (!window.ethereum || !isWalletConnected) {
      console.log('❌ Wallet not connected, skipping NFT fetch')
      return
    }
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const addr = await signer.getAddress()
      
      const nftContract = new ethers.Contract(STONER_NFT_ADDRESS, StonerNFTABI, provider)
      const feePoolContract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, provider)
      
      // Check approval
      const approvedAll = await nftContract.isApprovedForAll(addr, STONER_FEE_POOL_ADDRESS)
      setIsApprovedForAll(approvedAll)
      
      // Get wallet NFTs - use totalNFTsOwned for ERC404 tokens
      const balance = await nftContract.totalNFTsOwned(addr)
      console.log('🔢 Stoner NFT balance:', balance.toString())
      
      // Sanity check for unrealistic balances
      const numBalance = Number(balance)
      const maxReasonableBalance = 1000
      
      if (numBalance > maxReasonableBalance) {
        console.log(`⚠️ Balance seems unusually large (${numBalance}), limiting to ${maxReasonableBalance}`)
        setWalletNFTs([])
        setStakedNFTs([])
        setStatus(`Warning: NFT balance appears corrupted (${numBalance}). Please check the contract.`)
        return
      }
      
      const walletTokens = []
      
      // Try enumerable approach first
      let foundViaEnumerable = false
      try {
        // Check if tokenOfOwnerByIndex exists
        await nftContract.tokenOfOwnerByIndex(addr, 0)
        foundViaEnumerable = true
        console.log('✅ Using tokenOfOwnerByIndex approach')
        
        // Try to get all tokens owned (up to 50 max for performance)
        for (let i = 0; i < Math.min(Number(balance), 50); i++) {
          try {
            const tokenId = await nftContract.tokenOfOwnerByIndex(addr, i)
            console.log(`📝 Found wallet token ${i + 1}/${balance}: #${tokenId.toString()}`)
            let image = null
            
            try {
              let uri = await nftContract.tokenURI(tokenId)
              if (uri.startsWith('ipfs://')) {
                uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              if (uri.startsWith('http')) {
                const resp = await fetch(uri)
                const meta = await resp.json()
                image = meta.image || meta.image_url
                if (image && image.startsWith('ipfs://')) {
                  image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                }
              }
            } catch (e) {
              console.warn('Failed to fetch metadata for token', tokenId.toString())
            }
            
            walletTokens.push({ tokenId: tokenId.toString(), image })
          } catch (e) {
            console.warn(`Failed to get token at index ${i}:`, e.message)
            // Don't break - there might be gaps in token indices
            continue
          }
        }
      } catch (e) {
        console.log('❌ tokenOfOwnerByIndex not supported (ERC404 contract), trying event-based approach')
        foundViaEnumerable = false
        
        // For ERC404 contracts like StonerNFT, use direct ownership checking
        try {
          console.log('🔍 Using direct ownership verification for ERC404 contract...')
          
          const receivedTokens = new Set()
          
          // Optimized: Check larger ranges more efficiently
          const maxTokenId = Math.max(10000, Number(balance) * 50) // Estimate max token ID
          const batchSize = 20 // Check multiple tokens in parallel
          let foundCount = 0
          
          // Check tokens in batches
          for (let start = 1; start <= maxTokenId && foundCount < Number(balance); start += batchSize) {
            const end = Math.min(start + batchSize - 1, maxTokenId)
            
            // Create batch of ownership check promises
            const ownershipPromises = []
            for (let tokenId = start; tokenId <= end; tokenId++) {
              ownershipPromises.push(
                nftContract.ownerOf(tokenId)
                  .then(owner => ({ tokenId, owner: owner.toLowerCase() }))
                  .catch(() => ({ tokenId, owner: null })) // Token doesn't exist
              )
            }
            
            try {
              // Execute batch in parallel
              const results = await Promise.all(ownershipPromises)
              
              // Process results
              for (const { tokenId, owner } of results) {
                if (owner === addr.toLowerCase()) {
                  receivedTokens.add(tokenId.toString())
                  foundCount++
                  console.log(`✅ Found owned token via direct check: #${tokenId} (${foundCount}/${balance})`)
                  
                  // Stop early if we found enough
                  if (foundCount >= Number(balance)) break
                }
              }
            } catch (e) {
              console.warn(`Batch ${start}-${end} failed:`, e.message)
            }
            
            // Quick break if we found enough
            if (foundCount >= Number(balance)) break
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 10))
          }
          
          console.log(`🎯 Direct check found ${foundCount} total tokens`)
          
          // Validate ownership and fetch metadata in parallel
          const tokenIds = Array.from(receivedTokens).slice(0, 50) // Limit to 50 for performance
          console.log(`📋 Validating ${tokenIds.length} tokens and fetching metadata...`)
          
          // Process tokens in smaller parallel batches for metadata
          const metadataBatchSize = 5
          let validTokenCount = 0
          
          for (let i = 0; i < tokenIds.length; i += metadataBatchSize) {
            const batch = tokenIds.slice(i, i + metadataBatchSize)
            
            const metadataPromises = batch.map(async (tokenId) => {
              try {
                // Quick ownership re-validation
                const owner = await nftContract.ownerOf(tokenId)
                if (owner.toLowerCase() !== addr.toLowerCase()) {
                  return null
                }
                
                let image = null
                try {
                  let uri = await nftContract.tokenURI(tokenId)
                  if (uri.startsWith('ipfs://')) {
                    uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
                  }
                  if (uri.startsWith('http')) {
                    const resp = await fetch(uri)
                    const meta = await resp.json()
                    image = meta.image || meta.image_url
                    if (image && image.startsWith('ipfs://')) {
                      image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                    }
                  }
                } catch (e) {
                  console.warn('Failed to fetch metadata for token', tokenId)
                }
                
                return { tokenId: tokenId.toString(), image }
              } catch (e) {
                console.warn(`Token ${tokenId} validation failed:`, e.message)
                return null
              }
            })
            
            try {
              const results = await Promise.all(metadataPromises)
              
              for (const result of results) {
                if (result) {
                  walletTokens.push(result)
                  validTokenCount++
                  console.log(`✅ Validated token #${result.tokenId} (${validTokenCount}/${tokenIds.length})`)
                }
              }
            } catch (e) {
              console.warn(`Metadata batch ${i} failed:`, e.message)
            }
            
            // Minimal delay between metadata batches
            if (i + metadataBatchSize < tokenIds.length) {
              await new Promise(resolve => setTimeout(resolve, 50))
            }
          }
          
          if (validTokenCount > 0) {
            foundViaEnumerable = true // Mark as found via alternative method
            console.log(`🎉 Successfully loaded ${validTokenCount} Stoner NFTs via direct ownership check`)
          }
        } catch (directError) {
          console.warn('Direct ownership check failed:', directError.message)
        }
      }
      
      // If enumerable didn't work or found fewer tokens than expected, try multicall brute force
      if (!foundViaEnumerable || walletTokens.length < Number(balance)) {
        console.log('🔍 Trying multicall brute force token discovery...')
        try {
          // Multicall setup
          // You must install ethereum-multicall: npm install ethereum-multicall
          // Import at top: import { Multicall } from "ethereum-multicall";
          const { Multicall } = await import('ethereum-multicall');
          const multicall = new Multicall({ ethersProvider: provider, tryAggregate: true });
          const maxTokenId = 1000; // Lower for demo, increase as needed
          const calls = [];
          for (let tokenId = 0; tokenId <= maxTokenId; tokenId++) {
            calls.push({
              reference: `ownerOf_${tokenId}`,
              contractAddress: STONER_NFT_ADDRESS,
              abi: StonerNFTABI,
              calls: [{ methodName: 'ownerOf', methodParameters: [tokenId] }]
            });
          }
          const results = await multicall.call(calls);
          // Parse results
          // Collect owned token IDs
          const ownedTokenIds = Object.entries(results.results)
            .filter(([ref, result]) => {
              return result.callsReturnContext && result.callsReturnContext[0].returnValues && result.callsReturnContext[0].returnValues[0] &&
                result.callsReturnContext[0].returnValues[0].toLowerCase() === addr.toLowerCase();
            })
            .map(([ref]) => parseInt(ref.replace('ownerOf_', '')));

          // Fetch metadata in parallel
          const metadataPromises = ownedTokenIds.map(async (tokenId) => {
            // Check if already added
            const alreadyAdded = walletTokens.some(t => t.tokenId === tokenId.toString());
            if (alreadyAdded) return null;
            let image = null;
            try {
              let uri = await nftContract.tokenURI(tokenId);
              if (uri.startsWith('ipfs://')) {
              uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            if (uri.startsWith('http')) {
              const resp = await fetch(uri);
              const meta = await resp.json();
              image = meta.image || meta.image_url;
              if (image && image.startsWith('ipfs://')) {
                image = image.replace('ipfs://', 'https://ipfs.io/ipfs/');
              }
            }
          } catch (e) {
            console.warn('Failed to fetch metadata for token', tokenId.toString());
          }
          return { tokenId: tokenId.toString(), image };
        });
        const metadataResults = await Promise.all(metadataPromises);
        metadataResults.forEach(result => {
          if (result) walletTokens.push(result);
        });
        } catch (e) {
          console.warn('Multicall failed (network may not support it):', e.message);
          console.log('📋 Continuing with enumerable results only');
        }
      }
      
      console.log(`✅ Loaded ${walletTokens.length}/${balance} wallet Stoner NFTs`)
      setWalletNFTs(walletTokens)
      
      // Get staked NFTs - try multiple approaches for different StakeReceipt contract versions
      try {
        console.log('🔥 Fetching staked NFTs from StakeReceipt contract...')
        const stakeReceiptContract = new ethers.Contract(STONER_STAKE_RECEIPT_ADDRESS, StakeReceiptABI, provider)
        let stakedTokens = []
        
        // Method 1: Try getUserReceipts() if it exists (enhanced contract)
        try {
          const [receipts, originalTokenIds] = await stakeReceiptContract.getUserReceipts(addr)
          console.log('🔥 Raw receipts and original tokens from getUserReceipts:', receipts, originalTokenIds)
          
          const receiptIds = Array.from(receipts).map(id => id.toString())
          const stakedTokenIds = Array.from(originalTokenIds).map(id => id.toString())
          
          console.log('🔥 Staked Stoner NFT token IDs from receipts:', stakedTokenIds)
          
          for (let i = 0; i < stakedTokenIds.length; i++) {
            const tokenId = stakedTokenIds[i]
            const receiptId = receiptIds[i]
            
            let image = null
            try {
              let uri = await nftContract.tokenURI(tokenId)
              if (uri.startsWith('ipfs://')) {
                uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              if (uri.startsWith('http')) {
                const resp = await fetch(uri)
                const meta = await resp.json()
                image = meta.image || meta.image_url
                if (image && image.startsWith('ipfs://')) {
                  image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                }
              }
            } catch (e) {
              console.warn('Failed to fetch metadata for staked token', tokenId)
            }
            
            stakedTokens.push({ 
              tokenId: tokenId, 
              receiptId: receiptId,
              image 
            })
          }
          
        } catch (getUserReceiptsError) {
          console.log('🔥 getUserReceipts() not available, trying fallback method...')
          
          // Method 2: Fallback - check StakeReceipt balance and enumerate receipt tokens
          try {
            const receiptBalance = await stakeReceiptContract.balanceOf(addr)
            console.log('🔥 StakeReceipt balance:', receiptBalance.toString())
            
            if (receiptBalance > 0) {
              // Get all receipt token IDs owned by user
              const receiptTokenIds = []
              
              // If contract supports tokenOfOwnerByIndex, use it
              try {
                for (let i = 0; i < Number(receiptBalance); i++) {
                  const receiptId = await stakeReceiptContract.tokenOfOwnerByIndex(addr, i)
                  receiptTokenIds.push(receiptId.toString())
                }
                console.log('🔥 Receipt token IDs:', receiptTokenIds)
              } catch (e) {
                console.log('🔥 tokenOfOwnerByIndex not available, using brute force for receipts...')
                // Brute force method for receipt tokens (limited range)
                for (let tokenId = 1; tokenId <= 1000; tokenId++) {
                  try {
                    const owner = await stakeReceiptContract.ownerOf(tokenId)
                    if (owner.toLowerCase() === addr.toLowerCase()) {
                      receiptTokenIds.push(tokenId.toString())
                    }
                  } catch (e) {
                    // Token doesn't exist or not owned
                  }
                }
              }
              
              // For each receipt token, try to get the original staked token ID
              for (const receiptId of receiptTokenIds) {
                let originalTokenId = null
                
                // Try different methods to get original token ID
                try {
                  // Method 1: receiptToOriginalToken mapping
                  originalTokenId = await stakeReceiptContract.receiptToOriginalToken(receiptId)
                } catch (e) {
                  try {
                    // Method 2: getOriginalTokenId function
                    originalTokenId = await stakeReceiptContract.getOriginalTokenId(receiptId)
                  } catch (e2) {
                    // Method 3: Assume receipt ID = original token ID (simple contracts)
                    originalTokenId = receiptId
                  }
                }
                
                if (originalTokenId) {
                  let image = null
                  try {
                    let uri = await nftContract.tokenURI(originalTokenId)
                    if (uri.startsWith('ipfs://')) {
                      uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
                    }
                    if (uri.startsWith('http')) {
                      const resp = await fetch(uri)
                      const meta = await resp.json()
                      image = meta.image || meta.image_url
                      if (image && image.startsWith('ipfs://')) {
                        image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                      }
                    }
                  } catch (e) {
                    console.warn('Failed to fetch metadata for staked token', originalTokenId.toString())
                  }
                  
                  stakedTokens.push({ 
                    tokenId: originalTokenId.toString(), 
                    receiptId: receiptId,
                    image 
                  })
                }
              }
            }
          } catch (fallbackError) {
            console.log('🔥 Fallback method also failed:', fallbackError)
          }
        }
        
        console.log(`✅ Loaded ${stakedTokens.length} staked Stoner NFTs:`, stakedTokens.map(t => t.tokenId))
        setStakedNFTs(stakedTokens)
      } catch (e) {
        console.warn('Failed to fetch staked NFTs:', e)
      }
      
    } catch (e) {
      console.error('Failed to fetch NFTs:', e)
    }
  }

  // Fetch rewards function
  const fetchRewards = async () => {
    console.log('💰 fetchRewards called in StonerFeePoolActions')
    if (!window.ethereum || !isWalletConnected) {
      console.log('❌ Wallet not connected, skipping rewards fetch')
      return
    }
    
    try {
      setRewardsLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const addr = await signer.getAddress()
      
      const feePoolContract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, provider)
      
      // Get native S rewards
      const nativeEarned = await feePoolContract.calculatePendingRewards(addr)
      setNativeRewards(ethers.formatEther(nativeEarned))
      console.log('💎 Native S rewards:', ethers.formatEther(nativeEarned))
      
      // Get whitelisted tokens
      const whitelisted = await feePoolContract.getWhitelistedTokens()
      setWhitelistedTokens(whitelisted)
      console.log('📋 Whitelisted tokens:', whitelisted)
      
      // Get ERC20 rewards for each whitelisted token
      const erc20RewardPromises = whitelisted.map(async (tokenAddress) => {
        try {
          const earned = await feePoolContract.calculatePendingERC20Rewards(addr, tokenAddress)
          
          // Try to get token symbol and decimals
          let symbol = 'Unknown'
          let decimals = 18
          try {
            const tokenContract = new ethers.Contract(tokenAddress, [
              'function symbol() view returns (string)',
              'function decimals() view returns (uint8)'
            ], provider)
            symbol = await tokenContract.symbol()
            decimals = await tokenContract.decimals()
          } catch (e) {
            console.warn(`Failed to get token info for ${tokenAddress}:`, e.message)
          }
          
          return {
            address: tokenAddress,
            symbol,
            decimals,
            earned: ethers.formatUnits(earned, decimals),
            rawEarned: earned.toString()
          }
        } catch (e) {
          console.warn(`Failed to get rewards for token ${tokenAddress}:`, e.message)
          return null
        }
      })
      
      const erc20Results = (await Promise.all(erc20RewardPromises)).filter(result => result !== null)
      setErc20Rewards(erc20Results)
      console.log('🪙 ERC20 rewards:', erc20Results)
      
    } catch (e) {
      console.error('Failed to fetch rewards:', e)
    } finally {
      setRewardsLoading(false)
    }
  }

  // Check wallet connection on mount
  useEffect(() => {
    const initWallet = async () => {
      const connected = await checkWalletConnection()
      if (connected) {
        console.log('✅ Wallet already connected, fetching data...')
        // Small delay to ensure state is set
        setTimeout(() => {
          fetchNFTs()
          fetchRewards()
        }, 100)
      }
    }
    
    initWallet()
  }, [])

  // Fetch data when wallet connects
  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      console.log('🔗 Wallet connected, fetching NFTs and rewards...')
      fetchNFTs()
      fetchRewards()
    }
  }, [isWalletConnected, walletAddress])

  // Handle stake
  const handleStake = async () => {
    if (selectedTokens.length === 0) {
      setStatus('Select NFTs to stake first')
      return
    }
    
    setLoading(true)
    setStatus('')
    
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      
      let tx
      if (selectedTokens.length === 1) {
        tx = await contract.stake(selectedTokens[0])
      } else {
        tx = await contract.stakeMultiple(selectedTokens)
      }
      
      setStatus('Staking...')
      await tx.wait()
      setStatus('Staking successful!')
      setSelectedTokens([])
      
      // Refresh NFT lists
      await fetchNFTs()
    } catch (e) {
      setStatus('Staking failed: ' + (e.reason || e.message))
    }
    
    setLoading(false)
  }

  // Handle unstake
  const handleUnstake = async () => {
    if (selectedStakedTokens.length === 0) {
      setStatus('Select staked NFTs to unstake first')
      return
    }
    
    setLoading(true)
    setStatus('')
    
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      
      // Convert selected token IDs to receipt IDs
      // selectedStakedTokens contains original NFT token IDs, but we need receipt IDs
      const receiptIds = selectedStakedTokens.map(tokenId => {
        const stakedNFT = stakedNFTs.find(nft => nft.tokenId === tokenId)
        return stakedNFT ? stakedNFT.receiptId : tokenId
      })
      
      console.log('🔥 Unstaking with receipt IDs:', receiptIds)
      
      let tx
      if (receiptIds.length === 1) {
        tx = await contract.unstake(receiptIds[0])
      } else {
        tx = await contract.unstakeMultiple(receiptIds)
      }
      
      setStatus('Unstaking...')
      await tx.wait()
      setStatus('Unstaking successful!')
      setSelectedStakedTokens([])
      
      // Refresh NFT lists
      await fetchNFTs()
    } catch (e) {
      console.error('Unstaking failed:', e)
      setStatus('Unstaking failed: ' + (e.reason || e.message))
    }
    
    setLoading(false)
  }

  // Handle claim
  const handleClaim = async () => {
    setLoading(true)
    setStatus('')
    
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      const tx = await contract.claimAllRewards()
      setStatus('Claiming rewards...')
      await tx.wait()
      setStatus('Rewards claimed successfully!')
      
      // Refresh rewards after claiming
      await fetchRewards()
    } catch (e) {
      setStatus('Claim failed: ' + (e.reason || e.message))
    }
    
    setLoading(false)
  }

  // Handle claim native rewards only
  const handleClaimNative = async () => {
    setLoading(true)
    setStatus('')
    
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      const tx = await contract.claimRewardsOnly()
      setStatus('Claiming native rewards...')
      await tx.wait()
      setStatus('Native rewards claimed successfully!')
      
      // Refresh rewards after claiming
      await fetchRewards()
    } catch (e) {
      setStatus('Native claim failed: ' + (e.reason || e.message))
    }
    
    setLoading(false)
  }

  // Handle claim specific ERC20 token rewards
  const handleClaimERC20 = async (tokenAddress) => {
    setLoading(true)
    setStatus('')
    
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_FEE_POOL_ADDRESS, StonerFeePoolABI, signer)
      const tx = await contract.claimERC20Rewards(tokenAddress)
      setStatus('Claiming ERC20 rewards...')
      await tx.wait()
      setStatus('ERC20 rewards claimed successfully!')
      
      // Refresh rewards after claiming
      await fetchRewards()
    } catch (e) {
      setStatus('ERC20 claim failed: ' + (e.reason || e.message))
    }
    
    setLoading(false)
  }

  // Handle approval
  const handleApproveAll = async () => {
    setLoading(true)
    
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(STONER_NFT_ADDRESS, ['function setApprovalForAll(address,bool) external'], signer)
      const tx = await contract.setApprovalForAll(STONER_FEE_POOL_ADDRESS, true)
      await tx.wait()
      setIsApprovedForAll(true)
      setStatus('Approval successful!')
    } catch (e) {
      setStatus('Approval failed: ' + (e.reason || e.message))
    }
    
    setLoading(false)
  }

  return (
    <div className="p-6 bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm space-y-6">
      {/* Wallet Connection Section */}
      {!isWalletConnected ? (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">🌿</span>
          </div>
          <div>
            <h3 className="font-bold text-xl text-green-400 mb-2">Stoner NFT Staking</h3>
            <p className="text-muted mb-4">Connect your wallet to stake Stoner NFTs and earn rewards</p>
            <button 
              onClick={connectWallet}
              disabled={connectingWallet}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 font-medium flex items-center gap-2 mx-auto"
            >
              {connectingWallet ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Connecting...
                </>
              ) : (
                'Connect Wallet'
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">🌿</span>
          </div>
          <div>
            <h3 className="font-bold text-xl text-green-400">Stoner NFT Staking</h3>
            <p className="text-sm text-muted">Connected: {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</p>
          </div>
        </div>
        <button 
          onClick={handleClaim}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50 font-medium"
        >
          Claim Rewards
        </button>
      </div>

      {status && (
        <div className={`p-3 rounded-lg ${
          status.includes('successful') || status.includes('claimed') 
            ? 'bg-green-900/20 border border-green-500/20 text-green-400'
            : status.includes('failed') || status.includes('error')
            ? 'bg-red-900/20 border border-red-500/20 text-red-400'
            : 'bg-blue-900/20 border border-blue-500/20 text-blue-400'
        }`}>
          {status}
        </div>
      )}

      {/* Rewards Section */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">💰</span>
            </div>
            <h4 className="font-semibold text-yellow-400">Claimable Rewards</h4>
          </div>
          <button
            onClick={fetchRewards}
            disabled={rewardsLoading}
            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm disabled:opacity-50 hover:bg-yellow-700 transition-colors"
          >
            {rewardsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Native S Rewards */}
          <div className="bg-black/20 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-lg">⚡</span>
                <span className="font-medium text-blue-400">S Rewards</span>
              </div>
              <button
                onClick={handleClaimNative}
                disabled={loading || parseFloat(nativeRewards) === 0}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                Claim S
              </button>
            </div>
            <div className="text-2xl font-bold text-white">
              {parseFloat(nativeRewards).toFixed(6)} S
            </div>
          </div>

          {/* ERC20 Token Rewards */}
          {erc20Rewards.length > 0 ? (
            <div className="bg-black/20 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-lg">🪙</span>
                  <span className="font-medium text-green-400">Token Rewards</span>
                </div>
                <button
                  onClick={handleClaim}
                  disabled={loading || erc20Rewards.every(reward => parseFloat(reward.earned) === 0)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50 hover:bg-green-700 transition-colors"
                >
                  Claim All
                </button>
              </div>
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {erc20Rewards.map((reward, index) => (
                  <div key={reward.address} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{reward.symbol}:</span>
                      <span className="text-white font-medium">
                        {parseFloat(reward.earned).toFixed(4)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleClaimERC20(reward.address)}
                      disabled={loading || parseFloat(reward.earned) === 0}
                      className="px-2 py-1 bg-green-600/80 text-white rounded text-xs disabled:opacity-50 hover:bg-green-600 transition-colors"
                    >
                      Claim
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-black/20 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-400 text-lg">🪙</span>
                <span className="font-medium text-gray-400">Token Rewards</span>
              </div>
              <div className="text-sm text-gray-500">
                No whitelisted tokens or rewards available
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {(parseFloat(nativeRewards) > 0 || erc20Rewards.some(reward => parseFloat(reward.earned) > 0)) && (
          <div className="text-center">
            <button
              onClick={handleClaim}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg disabled:opacity-50 hover:from-yellow-600 hover:to-orange-700 transition-all font-semibold"
            >
              {loading ? 'Claiming...' : 'Claim All Rewards'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stake Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-green-400">Stake NFTs ({selectedTokens.length} selected)</h4>
            {!isApprovedForAll && (
              <button
                onClick={handleApproveAll}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
              >
                Approve All
              </button>
            )}
          </div>

          {walletNFTs.length === 0 ? (
            <div className="p-6 bg-card/30 rounded-xl text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-muted">No Stoner NFTs found in wallet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                {walletNFTs.slice(0, 12).map((nft) => (
                  <div
                    key={nft.tokenId}
                    className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                      selectedTokens.includes(nft.tokenId)
                        ? 'border-green-400 bg-green-400/10'
                        : 'border-transparent hover:border-accent/30'
                    }`}
                    onClick={() => {
                      if (selectedTokens.includes(nft.tokenId)) {
                        setSelectedTokens(prev => prev.filter(id => id !== nft.tokenId))
                      } else {
                        setSelectedTokens(prev => [...prev, nft.tokenId])
                      }
                    }}
                  >
                    <div className="aspect-square p-2">
                      <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size="100%" />
                    </div>
                    <div className="text-xs text-center p-1">#{nft.tokenId}</div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleStake}
                disabled={loading || selectedTokens.length === 0 || !isApprovedForAll}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Staking...' : `Stake ${selectedTokens.length} NFT${selectedTokens.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>

        {/* Unstake Section */}
        <div className="space-y-4">
          <h4 className="font-semibold text-blue-400">Unstake NFTs ({selectedStakedTokens.length} selected)</h4>

          {stakedNFTs.length === 0 ? (
            <div className="p-6 bg-card/30 rounded-xl text-center">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-muted">No staked NFTs</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                {stakedNFTs.slice(0, 12).map((nft) => (
                  <div
                    key={nft.tokenId}
                    className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                      selectedStakedTokens.includes(nft.tokenId)
                        ? 'border-blue-400 bg-blue-400/10'
                        : 'border-transparent hover:border-accent/30'
                    }`}
                    onClick={() => {
                      if (selectedStakedTokens.includes(nft.tokenId)) {
                        setSelectedStakedTokens(prev => prev.filter(id => id !== nft.tokenId))
                      } else {
                        setSelectedStakedTokens(prev => [...prev, nft.tokenId])
                      }
                    }}
                  >
                    <div className="aspect-square p-2">
                      <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size="100%" />
                    </div>
                    <div className="text-xs text-center p-1">#{nft.tokenId}</div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleUnstake}
                disabled={loading || selectedStakedTokens.length === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Unstaking...' : `Unstake ${selectedStakedTokens.length} NFT${selectedStakedTokens.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  )
}