import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import SwapPoolABI from '../abis/SwapPool.json'
import StakeReceiptABI from '../abis/StakeReceipt.json'
import NFTTokenImage from './NFTTokenImage'
import ApproveNFTButton from './ApproveNFTButton'
import NFTLoadingSkeleton from './NFTLoadingSkeleton'

export default function PoolActions({ swapPool, stakeReceipt, provider: externalProvider }) {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [walletNFTs, setWalletNFTs] = useState([])
  const [approvedMap, setApprovedMap] = useState({}) // tokenId -> bool
  const [nftCollection, setNftCollection] = useState(null)
  const [isApprovedForAll, setIsApprovedForAll] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)
  const [stakedNFTs, setStakedNFTs] = useState([])
  const [receiptNFTs, setReceiptNFTs] = useState([])
  const [poolNFTs, setPoolNFTs] = useState([]) // Add pool NFTs state
  const [selectedWalletTokens, setSelectedWalletTokens] = useState([])
  const [selectedReceiptTokens, setSelectedReceiptTokens] = useState([])
  const [selectedSwapTokens, setSelectedSwapTokens] = useState([])
  const [address, setAddress] = useState(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [poolLoading, setPoolLoading] = useState(false)
  const [contractInfo, setContractInfo] = useState(null)

  // Helper to get signer
  const getSigner = async () => {
    if (!window.ethereum) throw new Error('Wallet not found')
    const provider = new ethers.BrowserProvider(window.ethereum)
    return provider.getSigner()
  }

  // Manual refresh function for user-triggered updates
  const refreshNFTs = async () => {
    console.log('Manual refresh triggered')
    setWalletLoading(true)
    setReceiptLoading(true)
    setPoolLoading(true)
    
    // Clear existing data
    setWalletNFTs([])
    setReceiptNFTs([])
    setPoolNFTs([])
    setAddress(null)
    
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Re-fetch everything
    const provider = externalProvider || (window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null)
    if (!provider) {
      setWalletLoading(false)
      setReceiptLoading(false)
      setPoolLoading(false)
      return
    }
    
    let addr = null
    if (window.ethereum) {
      try {
        const signer = await provider.getSigner()
        addr = await signer.getAddress()
      } catch (e) {
        console.warn('Could not get signer:', e)
      }
    }
    setAddress(addr)
    
    // This will trigger the main useEffect to refetch NFTs
  }

  // Fetch user's NFTs and staked/receipt tokens
  useEffect(() => {
    const fetchNFTs = async () => {
      // Use externalProvider for read-only, fallback to window.ethereum if not provided
      const provider = externalProvider || (window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null)
      if (!provider) return
      
      setWalletLoading(true)
      setReceiptLoading(true)
      
      // Fetch contract info (pool size and staked count)
      try {
        const pool = new ethers.Contract(swapPool, SwapPoolABI, provider)
        const info = await pool.getContractInfo()
        setContractInfo({
          nftCollection: info[0],
          receiptContract: info[1], 
          stonerPool: info[2],
          swapFeeInWei: info[3],
          stonerShare: info[4],
          poolSize: Number(info[5]), // Available for swapping
          stakedCount: Number(info[6]) // Staked for rewards
        })
        console.log('📊 Contract Info:', {
          poolSize: Number(info[5]),
          stakedCount: Number(info[6])
        })
      } catch (e) {
        console.warn('Failed to fetch contract info:', e)
        setContractInfo(null)
      }
      
      let addr = null
      if (window.ethereum) {
        try {
          const signer = await provider.getSigner()
          addr = await signer.getAddress()
        } catch {}
      }
      setAddress(addr)
      
      // Fetch wallet NFTs from the specific NFT collection that this SwapPool manages
      let swapCollectionAddr = null
      try {
        swapCollectionAddr = await (new ethers.Contract(swapPool, SwapPoolABI, provider)).nftCollection()
        console.log(`🏷️ SwapPool NFT Collection Address:`, swapCollectionAddr)
        console.log(`👤 User Address:`, addr)
        console.log(`🏊 SwapPool Address:`, swapPool)
        console.log(`🏊 SwapPool Address:`, swapPool)
        setNftCollection(swapCollectionAddr)
        
        if (!swapCollectionAddr) {
          console.log('❌ Could not get NFT collection address from SwapPool')
          setWalletNFTs([])
          setWalletLoading(false)
          return
        }
        
        // Use the actual NFT collection that this SwapPool manages
        const nftContract = new ethers.Contract(
          swapCollectionAddr,
          [
            "function balanceOf(address) view returns (uint256)",
            "function ownerOf(uint256) view returns (address)",
            "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
            "function tokenURI(uint256) view returns (string)",
            "function getApproved(uint256) view returns (address)",
            "function isApprovedForAll(address,address) view returns (bool)",
            "function totalSupply() view returns (uint256)"
          ],
          provider
        )
        if (addr) {
          const balance = await nftContract.balanceOf(addr)
          console.log(`🎯 Collection NFT Balance for ${addr}:`, balance.toString())
          
          // For ERC404 tokens, balanceOf might return 0 even when you own tokens
          // So we always use fallback scanning for these types of collections
          const balanceNumber = Number(balance)
          console.log(`🎯 Collection NFT Balance for ${addr}: ${balance.toString()}`)
          
          if (balanceNumber === 0) {
            console.log(`⚠️ ERC404 token detected (balance=0), skipping enumerable approach and using fallback scan`)
          }
          
          const tokens = []
          // Check isApprovedForAll - check if NFTs are approved for the SwapPool
          let approvedAll = false
          try {
            approvedAll = await nftContract.isApprovedForAll(addr, swapPool)
          } catch {}
          setIsApprovedForAll(!!approvedAll)

          let tokenIds = []
          
          // For ERC404 tokens or unrealistic balances, skip enumerable and go straight to fallback
          const isBalanceRealistic = balanceNumber > 0 && balanceNumber <= 10000
          
          // Try enumerable approach first (only if balance is realistic and > 0)
          if (isBalanceRealistic && balanceNumber > 0) {
            try {
              console.log(`🔍 Trying enumerable approach for ${balance.toString()} collection tokens...`)
              const tokenIdPromises = []
              for (let i = 0; i < balanceNumber; i++) {
                tokenIdPromises.push(nftContract.tokenOfOwnerByIndex(addr, i))
              }
              tokenIds = await Promise.all(tokenIdPromises)
              console.log(`✅ Enumerable approach successful, found tokens:`, tokenIds.map(id => id.toString()))
            } catch (enumerableError) {
              console.log(`❌ tokenOfOwnerByIndex not supported, will use fallback scan for Collection NFTs`)
              tokenIds = [] // Reset for fallback
            }
          } else {
            console.log(`⚠️ Unrealistic balance (${balance.toString()}), skipping enumerable approach`)
            tokenIds = [] // Force fallback
          }
          
          // If we still don't have tokens, try fallback scan
          if (tokenIds.length === 0) {
            try {
              // Try to get total supply to know how many tokens exist
              let maxTokenId = 10000 // Default fallback range
              try {
                const totalSupply = await nftContract.totalSupply()
                maxTokenId = Math.min(Number(totalSupply) + 100, 10000) // Scan a bit beyond totalSupply but cap at 10k
                console.log(`📈 Collection NFT Total supply: ${totalSupply.toString()}, scanning up to token ${maxTokenId}`)
              } catch {
                console.log(`📈 Total supply not available, scanning up to token ${maxTokenId}`)
              }

              const ownedTokens = []
              const batchSize = 50 // Check 50 tokens at a time to avoid rate limits
              
              for (let startId = 1; startId <= maxTokenId; startId += batchSize) {
                const endId = Math.min(startId + batchSize - 1, maxTokenId)
                const batch = []
                
                // Create batch of ownership checks
                for (let tokenId = startId; tokenId <= endId; tokenId++) {
                  batch.push(
                    nftContract.ownerOf(tokenId)
                      .then(owner => ({ tokenId, owner }))
                      .catch(() => null) // Token doesn't exist or other error
                  )
                }
                
                // Wait for batch to complete
                const batchResults = await Promise.all(batch)
                
                // Filter for tokens owned by user
                const ownedInBatch = batchResults
                  .filter(result => result && result.owner.toLowerCase() === addr.toLowerCase())
                  .map(result => BigInt(result.tokenId))
                
                ownedTokens.push(...ownedInBatch)
                
                // Log progress for large scans
                if (startId % 200 === 1) {
                  console.log(`🔍 Scanned tokens ${startId}-${endId}, found ${ownedTokens.length} owned tokens so far`)
                }
                
                // For efficiency, if balance was realistic and we found all tokens, stop
                // But if balance is unrealistic, continue scanning to find all actual tokens
                if (isBalanceRealistic && ownedTokens.length >= balanceNumber) {
                  console.log(`✅ Found all ${ownedTokens.length} tokens according to realistic balance, stopping scan early`)
                  break
                }
              }
              
              tokenIds = ownedTokens
              console.log(`✅ Collection NFT fallback scan complete, found ${tokenIds.length} tokens:`, tokenIds.map(id => id.toString()))
              
              if (balanceNumber === 0 && tokenIds.length > 0) {
                console.log(`✅ ERC404 token detection successful: balance=0 but found ${tokenIds.length} actual tokens`)
              } else if (isBalanceRealistic && balanceNumber > 0 && tokenIds.length !== balanceNumber) {
                console.warn(`⚠️ Collection NFT count mismatch: balance=${balance.toString()}, found=${tokenIds.length}`)
              } else if (balanceNumber > 10000) {
                console.log(`✅ Found ${tokenIds.length} Collection NFTs (balance was unrealistic: ${balance.toString()})`)
              }
            } catch (fallbackError) {
              console.error('❌ Fallback token scanning failed:', fallbackError)
              tokenIds = []
            }
          }
          
          console.log(`🔢 Token IDs found:`, tokenIds.map(id => id.toString()))

          if (tokenIds.length === 0) {
            console.log(`📭 No tokens found for user`)
            setWalletNFTs([])
            setApprovedMap({})
            setWalletLoading(false)
            return
          }

          // Batch fetch all token URIs (parallel) from Collection NFT contract
          const tokenUriPromises = tokenIds.map(tokenId => 
            nftContract.tokenURI(tokenId).catch(err => {
              console.warn(`Failed to get URI for Collection token ${tokenId}:`, err)
              return null
            })
          )
          const tokenUris = await Promise.all(tokenUriPromises)
          console.log(`🌐 Collection NFT URIs fetched:`, tokenUris.length)

          // Batch check approvals (parallel) - check if Collection NFTs are approved for SwapPool
          const approvalPromises = tokenIds.map(tokenId => {
            if (approvedAll) return Promise.resolve(true)
            return nftContract.getApproved(tokenId).then(approved => 
              approved && swapPool && approved.toLowerCase() === swapPool.toLowerCase()
            ).catch(() => false)
          })
          const approvals = await Promise.all(approvalPromises)

          // Process metadata in parallel with limited concurrency to avoid rate limits
          const batchSize = 5 // Process 5 metadata requests at a time
          const walletTokens = []
          const approvedMapTemp = {}

          console.log(`🔄 Processing metadata for ${tokenIds.length} Collection NFTs in batches of ${batchSize}`)

          for (let i = 0; i < tokenIds.length; i += batchSize) {
            const batch = tokenIds.slice(i, i + batchSize)
            console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}: tokens ${i+1}-${Math.min(i+batchSize, tokenIds.length)}`)
            
            const batchPromises = batch.map(async (tokenId, batchIndex) => {
              const globalIndex = i + batchIndex
              let image = null
              const uri = tokenUris[globalIndex]
              
              if (uri) {
                try {
                  // Handle ipfs:// URIs
                  let processedUri = uri.startsWith('ipfs://') ? 
                    uri.replace('ipfs://', 'https://ipfs.io/ipfs/') : uri
                  
                  // Try to fetch image from metadata
                  if (processedUri.startsWith('http')) {
                    const resp = await fetch(processedUri)
                    const meta = await resp.json()
                    image = meta.image || meta.image_url || (meta.properties && meta.properties.image) || null
                    
                    // Handle ipfs:// in image field
                    if (image && image.startsWith('ipfs://')) {
                      image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                    }
                  }
                } catch (err) {
                  console.warn(`Failed to fetch metadata for token ${tokenId}:`, err)
                }
              }

              const tokenIdStr = tokenId.toString()
              approvedMapTemp[tokenIdStr] = approvals[globalIndex]
              return { tokenId: tokenIdStr, image }
            })

            // Wait for current batch to complete
            const batchResults = await Promise.all(batchPromises)
            walletTokens.push(...batchResults)
            console.log(`✅ Completed batch ${Math.floor(i/batchSize) + 1}, total processed: ${walletTokens.length}`)
          }
          console.log(`✅ Final Collection NFT tokens:`, walletTokens.length, walletTokens)
          setWalletNFTs(walletTokens)
          setApprovedMap(approvedMapTemp)
          setWalletLoading(false)
        }
      } catch (e) {
        console.error('❌ Error fetching wallet NFTs:', e)
        setWalletNFTs([])
        setWalletLoading(false)
      }
      // Fetch staked NFTs (getUserStakes)
      try {
        const pool = new ethers.Contract(swapPool, SwapPoolABI, provider)
        if (addr) {
          const staked = await pool.getUserStakes(addr)
          setStakedNFTs(staked.map(t => t.toString()))
        }
      } catch (e) {
        setStakedNFTs([])
      }
      // Fetch receipt tokens (ERC721) with enhanced image loading
      try {
        const receipt = new ethers.Contract(stakeReceipt, [
          "function balanceOf(address) view returns (uint256)", 
          "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)", 
          "function tokenURI(uint256) view returns (string)",
          "function receiptToOriginalToken(uint256) view returns (uint256)"
        ], provider)
        if (addr) {
          const balance = await receipt.balanceOf(addr)
          const tokens = []
          for (let i = 0; i < Number(balance); i++) {
            const receiptTokenId = await receipt.tokenOfOwnerByIndex(addr, i)
            let image = null
            
            try {
              // First, try to get the receipt's own tokenURI
              let uri = await receipt.tokenURI(receiptTokenId)
              console.log(`Receipt token ${receiptTokenId} URI:`, uri)
              
              if (uri && uri.startsWith('ipfs://')) {
                uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              if (uri && uri.startsWith('http')) {
                try {
                  const resp = await fetch(uri)
                  const meta = await resp.json()
                  image = meta.image || meta.image_url || (meta.properties && meta.properties.image) || null
                  if (image && image.startsWith('ipfs://')) {
                    image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                  }
                } catch (fetchErr) {
                  console.warn('Failed to fetch receipt metadata:', fetchErr)
                }
              }
              
              // If receipt doesn't have metadata, try to get the original NFT's image
              if (!image && swapCollectionAddr) {
                try {
                  const originalTokenId = await receipt.receiptToOriginalToken(receiptTokenId)
                  console.log(`Receipt ${receiptTokenId} maps to original token ${originalTokenId}`)
                  
                  const nftContract = new ethers.Contract(swapCollectionAddr, [
                    "function tokenURI(uint256) view returns (string)"
                  ], provider)
                  
                  let originalUri = await nftContract.tokenURI(originalTokenId)
                  if (originalUri && originalUri.startsWith('ipfs://')) {
                    originalUri = originalUri.replace('ipfs://', 'https://ipfs.io/ipfs/')
                  }
                  if (originalUri && originalUri.startsWith('http')) {
                    const resp = await fetch(originalUri)
                    const meta = await resp.json()
                    image = meta.image || meta.image_url || (meta.properties && meta.properties.image) || null
                    if (image && image.startsWith('ipfs://')) {
                      image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                    }
                  }
                } catch (originalErr) {
                  console.warn('Failed to fetch original NFT metadata for receipt:', originalErr)
                }
              }
            } catch (err) {
              console.warn('Failed to fetch receipt NFT metadata/image', receiptTokenId, err)
            }
            tokens.push({ tokenId: receiptTokenId.toString(), image })
          }
          setReceiptNFTs(tokens)
        }
      } catch (e) {
        console.error('Failed to fetch receipt NFTs:', e)
        setReceiptNFTs([])
      }
      
      // Fetch pool NFTs (available for swapping)
      try {
        const pool = new ethers.Contract(swapPool, SwapPoolABI, provider)
        const poolTokenIdsRaw = await pool.getPoolTokens()
        // Convert proxy result to actual array
        const poolTokenIds = Array.from(poolTokenIdsRaw).map(id => id.toString())
        console.log('🏊 Pool token IDs available for swap:', poolTokenIds)
        
        if (swapCollectionAddr && poolTokenIds.length > 0) {
          const poolNftContract = new ethers.Contract(swapCollectionAddr, [
            "function tokenURI(uint256) view returns (string)"
          ], provider)
          
          console.log(`🎨 Fetching metadata for ${poolTokenIds.length} pool NFTs from collection ${swapCollectionAddr}`)
          
          const tokens = []
          for (const tokenId of poolTokenIds) {
            let image = null
            try {
              let uri = await poolNftContract.tokenURI(tokenId)
              if (uri && uri.startsWith('ipfs://')) {
                uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              if (uri && uri.startsWith('http')) {
                const resp = await fetch(uri)
                if (resp.ok) {
                  const meta = await resp.json()
                  image = meta.image || meta.image_url || (meta.properties && meta.properties.image) || null
                  if (image && image.startsWith('ipfs://')) {
                    image = image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                  }
                }
              }
            } catch (err) {
              console.warn('Failed to fetch pool NFT metadata for token', tokenId, err)
            }
            tokens.push({ tokenId: tokenId.toString(), image })
          }
          setPoolNFTs(tokens)
          console.log('✅ Pool NFTs fetched:', tokens.length, tokens)
        } else {
          console.log('📭 No pool NFTs available or collection address missing')
          setPoolNFTs([])
        }
        setPoolLoading(false)
      } catch (e) {
        console.error('❌ Failed to fetch pool NFTs:', e)
        setPoolNFTs([])
        setPoolLoading(false)
      }
    }
    
    fetchNFTs()
    // eslint-disable-next-line
  }, [swapPool, stakeReceipt, address])

  // Listen for wallet account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        console.log('Wallet accounts changed:', accounts)
        // Clear current data and refetch
        setWalletNFTs([])
        setReceiptNFTs([])
        setPoolNFTs([])
        setAddress(accounts[0] || null)
      }

      const handleChainChanged = (chainId) => {
        console.log('Chain changed:', chainId)
        // Reload the page to reset state
        window.location.reload()
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  // Batch Stake
  const handleStake = async () => {
    setStatus('')
    // Preflight checks for batch staking
    if (selectedWalletTokens.length === 0) {
      setStatus('Select at least one NFT to stake.')
      return
    }
    if (selectedWalletTokens.length > 10) {
      setStatus('You can only stake up to 10 NFTs at once.')
      return
    }
    // Check for duplicates
    const unique = new Set(selectedWalletTokens)
    if (unique.size !== selectedWalletTokens.length) {
      setStatus('Duplicate NFTs selected. Please select each NFT only once.')
      return
    }
    // Check all are approved
    if (!isApprovedForAll && !selectedWalletTokens.every(tid => approvedMap[tid])) {
      setStatus('All selected NFTs must be approved before staking.')
      return
    }
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      
      // Add debug logging
      console.log('Attempting to stake:', selectedWalletTokens.length, 'NFTs')
      console.log('Token IDs:', selectedWalletTokens)
      console.log('Contract has stakeNFTBatch:', typeof contract.stakeNFTBatch === 'function')
      
      let tx
      if (selectedWalletTokens.length > 1) {
        // Always use batch function for multiple tokens
        tx = await contract.stakeNFTBatch(selectedWalletTokens)
      } else {
        tx = await contract.stakeNFT(selectedWalletTokens[0])
      }
      setStatus('Staking...')
      await tx.wait()
      setStatus('Stake successful!')
      setSelectedWalletTokens([]) // Clear selection after successful stake
    } catch (e) {
      setStatus('Stake failed: ' + (e.reason || e.message))
      console.error('Detailed stake error:', e)
    }
    setLoading(false)
  }

  // Batch Unstake
  const handleUnstake = async () => {
    setStatus('')
    // Preflight checks for batch unstaking
    if (selectedReceiptTokens.length === 0) {
      setStatus('Select at least one NFT to unstake.')
      return
    }
    if (selectedReceiptTokens.length > 10) {
      setStatus('You can only unstake up to 10 NFTs at once.')
      return
    }
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      let tx
      if (selectedReceiptTokens.length > 1 && contract.unstakeNFTBatch) {
        tx = await contract.unstakeNFTBatch(selectedReceiptTokens)
      } else {
        tx = await contract.unstakeNFT(selectedReceiptTokens[0])
      }
      setStatus('Unstaking...')
      await tx.wait()
      setStatus('Unstake successful!')
    } catch (e) {
      setStatus('Unstake failed: ' + (e.reason || e.message))
    }
    setLoading(false)
  }

  // Claim Rewards
  const handleClaim = async () => {
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      const tx = await contract.claimRewards()
      setStatus('Claiming rewards...')
      await tx.wait()
      setStatus('Rewards claimed!')
    } catch (e) {
      setStatus('Claim failed: ' + (e.reason || e.message))
    }
    setLoading(false)
  }

  // Swap NFT(s)
  const handleSwap = async () => {
    if (selectedSwapTokens.length === 0) {
      setStatus('Please select at least one NFT to swap')
      return
    }
    
    if (selectedSwapTokens.length > 10) {
      setStatus('You can only swap up to 10 NFTs at once.')
      return
    }

    // Check if there are enough pool NFTs available for swapping
    if (poolNFTs.length < selectedSwapTokens.length) {
      if (poolNFTs.length === 0) {
        setStatus(`❌ Cannot swap: Pool is empty! You need to stake some NFTs first to create liquidity for swapping.`)
      } else {
        setStatus(`❌ Insufficient liquidity: Only ${poolNFTs.length} NFT${poolNFTs.length !== 1 ? 's' : ''} available in pool, but you selected ${selectedSwapTokens.length}. Stake more NFTs or reduce your selection.`)
      }
      return
    }
    
    if (!nftCollection) {
      setStatus('NFT collection address not available')
      return
    }
    
    setStatus('')
    setLoading(true)
    try {
      const signer = await getSigner()
      const contract = new ethers.Contract(swapPool, SwapPoolABI, signer)
      
      // Create NFT contract instance for the collection being swapped (not Stoner NFT)
      const nftContract = new ethers.Contract(nftCollection, [
        "function approve(address,uint256)",
        "function getApproved(uint256) view returns (address)",
        "function ownerOf(uint256) view returns (address)",
        "function setApprovalForAll(address,bool)",
        "function isApprovedForAll(address,address) view returns (bool)"
      ], signer)
      
      // Check ownership and approval for all selected tokens
      const userAddr = await signer.getAddress()
      
      // Check if user owns all tokens
      setStatus('Verifying ownership...')
      for (const tokenId of selectedSwapTokens) {
        try {
          const owner = await nftContract.ownerOf(tokenId)
          if (owner.toLowerCase() !== userAddr.toLowerCase()) {
            setStatus(`❌ You do not own NFT #${tokenId}`)
            setLoading(false)
            return
          }
        } catch (err) {
          setStatus(`❌ Error checking ownership of NFT #${tokenId}`)
          setLoading(false)
          return
        }
      }
      
      // Check if approved for all or approve individually
      setStatus('Checking approvals...')
      let needsApproval = false
      
      // For multiple tokens, it's more efficient to use setApprovalForAll
      if (selectedSwapTokens.length > 1) {
        try {
          const isApprovedForAll = await nftContract.isApprovedForAll(userAddr, swapPool)
          if (!isApprovedForAll) {
            setStatus('Requesting approval for all NFTs...')
            const approveTx = await nftContract.setApprovalForAll(swapPool, true)
            await approveTx.wait()
            setStatus('✅ All NFTs approved')
          }
        } catch (e) {
          if (e.code === 'ACTION_REJECTED') {
            setStatus('❌ User cancelled approval transaction')
            setLoading(false)
            return
          }
          // Fallback to individual approvals if setApprovalForAll fails
          console.warn('setApprovalForAll failed, using individual approvals:', e)
          needsApproval = true
        }
      } else {
        needsApproval = true
      }
      
      // Individual approvals if needed
      if (needsApproval) {
        for (const tokenId of selectedSwapTokens) {
          try {
            const approved = await nftContract.getApproved(tokenId)
            if (approved.toLowerCase() !== swapPool.toLowerCase()) {
              setStatus(`Requesting approval for NFT #${tokenId}...`)
              const approveTx = await nftContract.approve(swapPool, tokenId)
              await approveTx.wait()
            }
          } catch (e) {
            if (e.code === 'ACTION_REJECTED') {
              setStatus('❌ User cancelled approval transaction')
              setLoading(false)
              return
            }
            setStatus(`❌ Failed to approve NFT #${tokenId}: ${e.message}`)
            setLoading(false)
            return
          }
        }
      }
      
      // Get swap fee and execute swap(s)
      const fee = await contract.swapFeeInWei()
      const totalFee = fee * BigInt(selectedSwapTokens.length)
      
      setStatus(`Swapping ${selectedSwapTokens.length} NFT${selectedSwapTokens.length > 1 ? 's' : ''}...`)
      
      let tx
      if (selectedSwapTokens.length > 1 && contract.swapNFTBatch) {
        // Use batch swap function
        tx = await contract.swapNFTBatch(selectedSwapTokens, { value: totalFee })
      } else {
        // For single NFT or if batch function not available, use single swap
        tx = await contract.swapNFT(selectedSwapTokens[0], { value: fee })
      }
      
      await tx.wait()
      setStatus(`✅ Successfully swapped ${selectedSwapTokens.length} NFT${selectedSwapTokens.length > 1 ? 's' : ''}!`)
      
      // Refresh NFT lists and clear selection
      fetchUserNFTs()
      fetchPoolTokens()
      setSelectedSwapTokens([])
      
    } catch (e) {
      console.error('Swap error:', e)
      
      // Handle specific error types
      if (e.code === 'ACTION_REJECTED') {
        setStatus('❌ User cancelled transaction')
      } else if (e.data === '0xa17e11d5' || e.message.includes('InsufficientLiquidity')) {
        setStatus(`❌ Insufficient liquidity: Not enough NFTs in pool for ${selectedSwapTokens.length} swap${selectedSwapTokens.length > 1 ? 's' : ''}`)
      } else if (e.data === '0xa0712d68' || e.message.includes('SameTokenSwap')) {
        setStatus('❌ Cannot swap: One of your NFTs is already in the pool')
      } else if (e.data === '0x82b42900' || e.message.includes('TokenNotApproved')) {
        setStatus('❌ NFT not approved for transfer')
      } else if (e.data === '0x8baa579f' || e.message.includes('NotTokenOwner')) {
        setStatus('❌ You do not own one or more of the selected NFTs')
      } else if (e.data === '0x025dbdd4' || e.message.includes('IncorrectFee')) {
        setStatus('❌ Incorrect swap fee sent')
      } else if (e.data === '0xd05cb609' || e.message.includes('NotInitialized')) {
        setStatus('❌ Pool not initialized')
      } else {
        // Generic error handling
        const errorMessage = e.reason || e.message || 'Unknown error'
        setStatus('❌ Swap failed: ' + errorMessage)
      }
    }
    setLoading(false)
  }

  return (
    <div className="mt-6 p-4 sm:p-6 bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-lg text-blue-600 dark:text-blue-400 tracking-wide">Pool Actions</h4>
        <button 
          onClick={refreshNFTs}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-1.5"
          title="Refresh all NFTs"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Contract Info Display */}
      {contractInfo && (
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-1">🏊</div>
              <div className="font-semibold text-blue-600 dark:text-blue-400">Pool Size</div>
              <div className="text-lg font-bold">{contractInfo.poolSize}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Available for swapping</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🔒</div>
              <div className="font-semibold text-green-600 dark:text-green-400">Staked Count</div>
              <div className="text-lg font-bold">{contractInfo.stakedCount}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Earning rewards</div>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-green-400">Stake NFT(s)</div>
            <div className="flex items-center gap-2">
              <div className={`text-xs px-2 py-1 rounded ${selectedWalletTokens.length > 8 ? 'bg-yellow-900/30 text-yellow-300' : selectedWalletTokens.length > 0 ? 'bg-green-900/30 text-green-300' : 'bg-gray-800/30 text-gray-400'}`}>
                📊 {selectedWalletTokens.length}/10 selected
              </div>
              <div className="text-xs text-green-300 bg-green-900/30 px-2 py-1 rounded">
                📦 Max 10 NFTs per batch
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {walletLoading ? (
              <NFTLoadingSkeleton count={6} size={56} />
            ) : walletNFTs.length === 0 ? (
              <div className="text-muted italic">No NFTs in wallet</div>
            ) : (
              walletNFTs.map(nft => (
                <div key={nft.tokenId} className="flex flex-col items-center">
                  <button className={`border-2 rounded-xl p-1 bg-gradient-to-br from-green-900/20 to-card shadow-sm transition-all ${selectedWalletTokens.includes(nft.tokenId) ? 'border-green-400 scale-105' : 'border-gray-700 hover:border-green-400'} text-text`} onClick={() => setSelectedWalletTokens(tokens => tokens.includes(nft.tokenId) ? tokens.filter(t => t !== nft.tokenId) : [...tokens, nft.tokenId])} disabled={loading}>
                    <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
                    <div className="text-xs text-center text-text font-mono">#{nft.tokenId}</div>
                  </button>
                {swapPool && !isApprovedForAll && (
                  <ApproveNFTButton
                    nftAddress={nftCollection}
                    tokenId={nft.tokenId}
                    spender={swapPool}
                    provider={externalProvider}
                    disabled={loading || approvedMap[nft.tokenId]}
                    onApproved={() => setApprovedMap(m => ({ ...m, [nft.tokenId]: true }))}
                  />
                )}
              </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-400 text-white rounded-lg shadow font-semibold tracking-wide disabled:opacity-50" onClick={handleStake} disabled={loading || selectedWalletTokens.length === 0 || !selectedWalletTokens.every(tid => approvedMap[tid] || isApprovedForAll)}>Stake Selected</button>
            {swapPool && !isApprovedForAll && (
              <button className="px-3 py-2 bg-blue-600 text-white rounded shadow text-xs font-semibold disabled:opacity-50" disabled={approvingAll || loading} onClick={async () => {
                setApprovingAll(true)
                try {
                  if (!window.ethereum) throw new Error('Wallet not found')
                  const signer = await (new ethers.BrowserProvider(window.ethereum)).getSigner()
                  const nft = new ethers.Contract(nftCollection, ["function setApprovalForAll(address,bool) external"], signer)
                  const tx = await nft.setApprovalForAll(swapPool, true)
                  await tx.wait()
                  setIsApprovedForAll(true)
                  setApprovedMap(m => {
                    const all = { ...m }
                    walletNFTs.forEach(nft => { all[nft.tokenId] = true })
                    return all
                  })
                } catch (e) {
                  alert(e.reason || e.message)
                }
                setApprovingAll(false)
              }}>
                {approvingAll ? 'Approving All...' : 'Approve All'}
              </button>
            )}
            {isApprovedForAll && <span className="text-green-400 font-semibold text-xs ml-2">All Approved</span>}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-red-400">Unstake NFT(s)</div>
            <div className="flex items-center gap-2">
              <div className={`text-xs px-2 py-1 rounded ${selectedReceiptTokens.length > 8 ? 'bg-yellow-900/30 text-yellow-300' : selectedReceiptTokens.length > 0 ? 'bg-red-900/30 text-red-300' : 'bg-gray-800/30 text-gray-400'}`}>
                📊 {selectedReceiptTokens.length}/10 selected
              </div>
              <div className="text-xs text-red-300 bg-red-900/30 px-2 py-1 rounded">
                📦 Max 10 NFTs per batch
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {receiptNFTs.length === 0 && <div className="text-muted italic">No receipt tokens</div>}
            {receiptNFTs.map(nft => (
              <button key={nft.tokenId} className={`border-2 rounded-xl p-1 bg-gradient-to-br from-red-900/20 to-card shadow-sm transition-all ${selectedReceiptTokens.includes(nft.tokenId) ? 'border-red-400 scale-105' : 'border-gray-700 hover:border-red-400'} text-text`} onClick={() => setSelectedReceiptTokens(tokens => tokens.includes(nft.tokenId) ? tokens.filter(t => t !== nft.tokenId) : [...tokens, nft.tokenId])} disabled={loading}>
                <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
                <div className="text-xs text-center text-text font-mono">#{nft.tokenId}</div>
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-400 text-white rounded-lg shadow mt-3 font-semibold tracking-wide disabled:opacity-50" onClick={handleUnstake} disabled={loading || selectedReceiptTokens.length === 0}>Unstake Selected</button>
        </div>
        <div>
          <div className="font-semibold mb-2 text-yellow-400">Claim Rewards</div>
          <button className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg shadow font-semibold tracking-wide disabled:opacity-50" onClick={handleClaim} disabled={loading}>Claim</button>
        </div>
        <div>
          <div className="font-semibold mb-2 text-purple-400">Pool NFTs Available for Swap</div>
          <div className="flex gap-3 flex-wrap">
            {poolLoading ? (
              <NFTLoadingSkeleton count={6} size={56} />
            ) : poolNFTs.length === 0 ? (
              <div className="w-full p-4 bg-secondary/50 rounded-lg text-center">
                <div className="text-2xl mb-2">🏊‍♂️</div>
                <div className="text-muted dark:text-muted mb-1">No NFTs in pool</div>
                <div className="text-sm text-muted dark:text-muted">
                  This collection pool is empty. Stake collection NFTs to add them to the pool for swapping!
                </div>
              </div>
            ) : (
              poolNFTs.map(nft => (
                <div key={nft.tokenId} className="flex flex-col items-center">
                  <div className="border-2 border-purple-600/50 rounded-xl p-1 bg-gradient-to-br from-purple-900/20 to-card shadow-sm">
                    <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
                    <div className="text-xs text-center text-text font-mono">#{nft.tokenId}</div>
                    <div className="text-xs text-center text-purple-400 font-semibold">AVAILABLE</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          {poolNFTs.length === 0 && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="text-blue-400 text-lg">ℹ️</div>
                <div>
                  <div className="font-semibold text-blue-400 mb-1">How to Enable Swapping:</div>
                  <div className="text-sm text-blue-300">
                    1. <strong>Stake</strong> your NFTs first (above) to add them to the pool<br/>
                    2. Other users can then <strong>swap</strong> their NFTs with yours<br/>
                    3. You receive a receipt token that you can later unstake
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-indigo-400">Swap Your NFT(s)</div>
            <div className="flex items-center gap-2">
              <div className={`text-xs px-2 py-1 rounded ${selectedSwapTokens.length > 8 ? 'bg-yellow-900/30 text-yellow-300' : selectedSwapTokens.length > 0 ? 'bg-indigo-900/30 text-indigo-300' : 'bg-gray-800/30 text-gray-400'}`}>
                📊 {selectedSwapTokens.length}/10 selected
              </div>
              <div className="text-xs text-indigo-300 bg-indigo-900/30 px-2 py-1 rounded">
                📦 Max 10 NFTs per batch
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {walletNFTs.length === 0 && <div className="text-muted italic">No NFTs in wallet</div>}
            {walletNFTs.map(nft => (
              <button 
                key={nft.tokenId} 
                className={`border-2 rounded-xl p-1 bg-gradient-to-br from-indigo-900/20 to-card shadow-sm transition-all ${
                  selectedSwapTokens.includes(nft.tokenId) 
                    ? 'border-indigo-400 scale-105 ring-2 ring-indigo-400/50' 
                    : 'border-gray-700 hover:border-indigo-400'
                } text-text ${selectedSwapTokens.length >= 10 && !selectedSwapTokens.includes(nft.tokenId) ? 'opacity-50 cursor-not-allowed' : ''}`} 
                onClick={() => {
                  if (selectedSwapTokens.includes(nft.tokenId)) {
                    // Remove from selection
                    setSelectedSwapTokens(prev => prev.filter(id => id !== nft.tokenId))
                  } else if (selectedSwapTokens.length < 10) {
                    // Add to selection if under limit
                    setSelectedSwapTokens(prev => [...prev, nft.tokenId])
                  }
                }}
                disabled={loading || (selectedSwapTokens.length >= 10 && !selectedSwapTokens.includes(nft.tokenId))}
              >
                <NFTTokenImage image={nft.image} tokenId={nft.tokenId} size={56} />
                <div className="text-xs text-center text-text font-mono">#{nft.tokenId}</div>
                {selectedSwapTokens.includes(nft.tokenId) && (
                  <div className="text-xs text-center text-indigo-400 font-semibold">✓ SELECTED</div>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button 
              className={`px-4 py-2 text-white rounded-lg shadow font-semibold tracking-wide disabled:opacity-50 flex items-center gap-2 ${
                poolNFTs.length === 0 
                  ? 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-indigo-500 to-blue-500'
              }`}
              onClick={handleSwap} 
              disabled={loading || selectedSwapTokens.length === 0 || poolNFTs.length === 0}
              title={poolNFTs.length === 0 ? 'Pool is empty - stake NFTs first to enable swapping' : ''}
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {poolNFTs.length === 0 
                ? '⚠️ Pool Empty - Stake NFTs First' 
                : loading 
                  ? 'Swapping...' 
                  : `Swap Selected (${selectedSwapTokens.length})`
              }
            </button>
            {selectedSwapTokens.length > 0 && (
              <button 
                className="px-3 py-2 bg-gray-600 text-white rounded shadow text-sm hover:bg-gray-500 transition" 
                onClick={() => setSelectedSwapTokens([])}
                disabled={loading}
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
  {status && <div className="mt-4 text-base text-accent font-semibold animate-pulse">{status}</div>}
      </div>
    </div>
  )
}
