// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// ============================================================================
// Non-upgradeable OpenZeppelin Contracts (Embedded)
// ============================================================================

// Context
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

// Ownable
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// Pausable
abstract contract Pausable is Context {
    event Paused(address account);
    event Unpaused(address account);

    bool private _paused;

    constructor() {
        _paused = false;
    }

    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    modifier whenPaused() {
        _requirePaused();
        _;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    function _requireNotPaused() internal view virtual {
        require(!paused(), "Pausable: paused");
    }

    function _requirePaused() internal view virtual {
        require(paused(), "Pausable: not paused");
    }

    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

// ReentrancyGuard
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
    }

    function _nonReentrantAfter() private {
        _status = _NOT_ENTERED;
    }
}

// IERC165
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// IERC721
interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool _approved) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

// IERC721Receiver
interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

// ============================================================================
// Contract Interfaces
// ============================================================================

interface IReceiptContract {
    function mint(address to, uint256 poolSlotId) external returns (uint256 receiptTokenId);
    function burn(uint256 receiptTokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function getPoolSlotId(uint256 receiptTokenId) external view returns (uint256);
    function validateReceipt(uint256 receiptTokenId, address expectedPool) external view returns (bool);
}

// ============================================================================
// Main Contract -  DESIGN
// ============================================================================

contract SwapPool is Ownable, Pausable, ReentrancyGuard, IERC721Receiver {

    // Core state variables
    address public nftCollection;
    address public receiptContract;
    address public stonerPool;
    uint256 public swapFeeInWei;
    uint256 public stonerShare; // Percentage (0–100)
    bool public initialized;

    // Pool management - NOW THESE ARE THE SAME THING!
    uint256[] public poolTokens;                    // NFTs available for swapping (THE LIQUIDITY)
    mapping(uint256 => uint256) public tokenIndexInPool; // tokenId => index in poolTokens array
    
    // Pool slot tracking (this is the key insight!)
    struct PoolSlot {
        address originalStaker;     // Who originally staked this slot
        uint256 stakedAt;          // When this slot was created
        bool active;               // Is this slot still active
        uint256 receiptTokenId;    // Receipt token for this slot
        uint256 currentTokenId;    // Current token in this slot (tracks swaps)
    }
    
    mapping(uint256 => PoolSlot) public poolSlots;           // slotId => PoolSlot info
    mapping(address => uint256[]) public userSlots;          // user => slotIds[]
    mapping(uint256 => uint256) public receiptToSlot;        // receiptTokenId => slotId
    mapping(uint256 => uint256) public tokenToSlot;          // currentTokenId => slotId
    
    uint256 public nextSlotId = 1;                           // Counter for slot IDs
    uint256 public totalActiveSlots;                         // Number of active slots (for rewards)

    // Reward system
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    uint256 public totalRewardsDistributed;

    // Precision helpers
    uint256 private constant PRECISION = 1e18;
    uint256 private rewardCarry;

    // User reward tracking
    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public userRewardPerTokenPaid;

    // Batch limits
    uint256 public maxBatchSize = 10;
    uint256 public maxUnstakeAllLimit = 20;

    // Events
    event SwapExecuted(address indexed user, uint256 tokenIdIn, uint256 tokenIdOut, uint256 slotId, uint256 feePaid);
    event BatchSwapExecuted(address indexed user, uint256 swapCount, uint256 totalFeePaid);
    event Staked(address indexed user, uint256 tokenId, uint256 slotId, uint256 receiptTokenId);
    event Unstaked(address indexed user, uint256 tokenId, uint256 slotId, uint256 receiptTokenId);
    event BatchUnstaked(address indexed user, uint256[] receiptTokenIds, uint256[] tokensReceived);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsDistributed(uint256 amount);
    event SwapFeeUpdated(uint256 newFeeInWei);
    event StonerShareUpdated(uint256 newShare);
    event BatchLimitsUpdated(uint256 newMaxBatchSize, uint256 newMaxUnstakeAll);
    event FeeSplit(uint256 stonerAmount, uint256 rewardsAmount);

    // Errors
    error AlreadyInitialized();
    error NotInitialized();
    error InvalidStonerShare();
    error TokenUnavailable();
    error IncorrectFee();
    error NotSlotOwner();
    error SlotNotActive();
    error NoRewardsToClaim();
    error InvalidReceiptToken();
    error NoTokensAvailable();
    error SameTokenSwap();
    error NotTokenOwner();
    error TokenNotApproved();

    modifier onlyInitialized() {
        if (!initialized) revert NotInitialized();
        _;
    }
    
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            pendingRewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    constructor(
        address _nftCollection,
        address _receiptContract,
        address _stonerPool,
        uint256 _swapFeeInWei,
        uint256 _stonerShare
    ) {
        if (_stonerShare > 100) revert InvalidStonerShare();

        nftCollection = _nftCollection;
        receiptContract = _receiptContract;
        stonerPool = _stonerPool;
        swapFeeInWei = _swapFeeInWei;
        stonerShare = _stonerShare;
        initialized = true;

        lastUpdateTime = block.timestamp;
    }

    // -------------------- STAKE (ADD LIQUIDITY) --------------------
    function stakeNFT(uint256 tokenId)
        external
        whenNotPaused
        onlyInitialized
        nonReentrant
        updateReward(msg.sender)
    {
        require(tokenId != 0, "SwapPool: Invalid token ID");
        require(msg.sender != address(0), "SwapPool: Invalid sender");
        
        // Create new pool slot atomically to prevent race conditions
        uint256 slotId = nextSlotId;
        nextSlotId = slotId + 1;
        
        // Validate slot is not already used (double-check for safety)
        require(poolSlots[slotId].originalStaker == address(0), "SwapPool: Slot already exists");
        
        // Transfer NFT to contract (this can revert safely before state changes)
        IERC721(nftCollection).transferFrom(msg.sender, address(this), tokenId);
        
        // Mint receipt token
        uint256 receiptTokenId = IReceiptContract(receiptContract).mint(msg.sender, slotId);
        
        // Add to pool tokens (available for swapping)
        tokenIndexInPool[tokenId] = poolTokens.length;
        poolTokens.push(tokenId);
        
        // Track the pool slot
        poolSlots[slotId] = PoolSlot({
            originalStaker: msg.sender,
            stakedAt: block.timestamp,
            active: true,
            receiptTokenId: receiptTokenId,
            currentTokenId: tokenId
        });
        
        // Update mappings
        userSlots[msg.sender].push(slotId);
        receiptToSlot[receiptTokenId] = slotId;
        tokenToSlot[tokenId] = slotId;
        totalActiveSlots++;

        emit Staked(msg.sender, tokenId, slotId, receiptTokenId);
    }

    function stakeNFTBatch(uint256[] calldata tokenIds)
        external
        whenNotPaused
        onlyInitialized
        nonReentrant
        updateReward(msg.sender)
    {
        uint256 n = tokenIds.length;
        require(n > 0 && n <= maxBatchSize, "Invalid batch size");
        _checkForDuplicates(tokenIds);

        // Pre-validate ownership and token IDs in single loop for gas efficiency
        for (uint256 i = 0; i < n; ++i) {
            uint256 tokenId = tokenIds[i];
            require(tokenId != 0, "SwapPool: Invalid token ID");
            require(IERC721(nftCollection).ownerOf(tokenId) == msg.sender, "Not token owner");
        }

        for (uint256 i = 0; i < n; ++i) {
            uint256 tokenId = tokenIds[i];
            
            // Create new pool slot atomically
            uint256 slotId = nextSlotId;
            nextSlotId = slotId + 1;
            
            // Validate slot is not already used
            require(poolSlots[slotId].originalStaker == address(0), "SwapPool: Slot already exists");
            
            // Transfer NFT to contract
            IERC721(nftCollection).transferFrom(msg.sender, address(this), tokenId);
            
            // Mint receipt token
            uint256 receiptTokenId = IReceiptContract(receiptContract).mint(msg.sender, slotId);
            
            // Add to pool tokens
            tokenIndexInPool[tokenId] = poolTokens.length;
            poolTokens.push(tokenId);
            
            // Track the pool slot
            poolSlots[slotId] = PoolSlot({
                originalStaker: msg.sender,
                stakedAt: block.timestamp,
                active: true,
                receiptTokenId: receiptTokenId,
                currentTokenId: tokenId
            });
            
            // Update mappings
            userSlots[msg.sender].push(slotId);
            receiptToSlot[receiptTokenId] = slotId;
            tokenToSlot[tokenId] = slotId;
            totalActiveSlots++;

            emit Staked(msg.sender, tokenId, slotId, receiptTokenId);
        }
    }

    // -------------------- SWAP (USE LIQUIDITY) --------------------
    function swapNFT(uint256 tokenIdIn)
        external
        payable
        whenNotPaused
        onlyInitialized
        nonReentrant
        updateReward(address(0))
    {
        require(tokenIdIn != 0, "SwapPool: Invalid token ID");
        require(msg.sender != address(0), "SwapPool: Invalid sender");
        require(IERC721(nftCollection).ownerOf(tokenIdIn) == msg.sender, "SwapPool: Not token owner");
        require(IERC721(nftCollection).isApprovedForAll(msg.sender, address(this)) || 
                IERC721(nftCollection).getApproved(tokenIdIn) == address(this), "SwapPool: Token not approved");
        
        if (poolTokens.length == 0) revert NoTokensAvailable();
        if (msg.value != swapFeeInWei) revert IncorrectFee();

        // Get random token from pool
        uint256 tokenIdOut = _getRandomAvailableToken();
        if (tokenIdOut == tokenIdIn) revert SameTokenSwap();

        // Find which slot this token belongs to and update it
        uint256 affectedSlotId = tokenToSlot[tokenIdOut];
        if (affectedSlotId != 0) {
            poolSlots[affectedSlotId].currentTokenId = tokenIdIn;
            tokenToSlot[tokenIdIn] = affectedSlotId;
            delete tokenToSlot[tokenIdOut];
        }

        // Replace the token in the pool
        _replaceTokenInPool(tokenIdOut, tokenIdIn);

        // Transfer tokens
        IERC721(nftCollection).transferFrom(msg.sender, address(this), tokenIdIn);
        IERC721(nftCollection).safeTransferFrom(address(this), msg.sender, tokenIdOut);

        // Distribute fees
        _distributeFees(msg.value);

        emit SwapExecuted(msg.sender, tokenIdIn, tokenIdOut, affectedSlotId, msg.value);
    }

    function swapNFTBatch(uint256[] calldata tokenIdsIn)
        external
        payable
        whenNotPaused
        onlyInitialized
        nonReentrant
        updateReward(address(0))
    {
        uint256 swapCount = tokenIdsIn.length;
        require(swapCount > 0 && swapCount <= maxBatchSize, "Invalid batch size");
        require(poolTokens.length >= swapCount, "Insufficient liquidity");
        
        uint256 totalFeeRequired = swapCount * swapFeeInWei;
        if (msg.value != totalFeeRequired) revert IncorrectFee();

        _checkForDuplicates(tokenIdsIn);

        // Execute swaps
        for (uint256 i = 0; i < swapCount; ++i) {
            uint256 tokenIdIn = tokenIdsIn[i];
            uint256 tokenIdOut = _getRandomAvailableToken();
            
            // Prevent self-swap
            while (tokenIdOut == tokenIdIn && poolTokens.length > 1) {
                tokenIdOut = _getRandomAvailableToken();
            }

            // Find slot and update current token
            uint256 affectedSlotId = tokenToSlot[tokenIdOut];
            if (affectedSlotId != 0) {
                poolSlots[affectedSlotId].currentTokenId = tokenIdIn;
                tokenToSlot[tokenIdIn] = affectedSlotId;
                delete tokenToSlot[tokenIdOut];
            }

            // Replace token in pool
            _replaceTokenInPool(tokenIdOut, tokenIdIn);

            // Transfer tokens
            IERC721(nftCollection).transferFrom(msg.sender, address(this), tokenIdIn);
            IERC721(nftCollection).safeTransferFrom(address(this), msg.sender, tokenIdOut);
        }

        // Distribute fees
        _distributeFees(msg.value);

        emit BatchSwapExecuted(msg.sender, swapCount, msg.value);
    }

    // -------------------- UNSTAKE (REMOVE LIQUIDITY) --------------------
    function unstakeNFT(uint256 receiptTokenId)
        external
        whenNotPaused
        onlyInitialized
        updateReward(msg.sender)
    {
        _unstakeInternal(receiptTokenId);
    }

    function unstakeNFTBatch(uint256[] calldata receiptTokenIds)
        external
        whenNotPaused
        onlyInitialized
        updateReward(msg.sender)
    {
        require(receiptTokenIds.length <= maxBatchSize, "Invalid batch size");
        
        uint256[] memory returnedTokens = new uint256[](receiptTokenIds.length);
        
        for (uint256 i = 0; i < receiptTokenIds.length; ++i) {
            returnedTokens[i] = _unstakeInternal(receiptTokenIds[i]);
        }

        emit BatchUnstaked(msg.sender, receiptTokenIds, returnedTokens);
    }

    function unstakeAllNFTs()
        external
        whenNotPaused
        onlyInitialized
        updateReward(msg.sender)
    {
        uint256[] memory userSlotIds = userSlots[msg.sender];
        require(userSlotIds.length > 0, "No staked NFTs");
        require(userSlotIds.length <= maxUnstakeAllLimit, "Too many staked NFTs");

        uint256[] memory receiptTokenIds = new uint256[](userSlotIds.length);
        uint256[] memory returnedTokens = new uint256[](userSlotIds.length);
        
        // Process in reverse to avoid array issues
        for (uint256 i = userSlotIds.length; i > 0; --i) {
            uint256 slotId = userSlotIds[i - 1];
            uint256 receiptTokenId = poolSlots[slotId].receiptTokenId;
            
            receiptTokenIds[i - 1] = receiptTokenId;
            returnedTokens[i - 1] = _unstakeInternal(receiptTokenId);
        }

        emit BatchUnstaked(msg.sender, receiptTokenIds, returnedTokens);
    }

    function _unstakeInternal(uint256 receiptTokenId) internal returns (uint256) {
        uint256 slotId = receiptToSlot[receiptTokenId];
        PoolSlot storage slot = poolSlots[slotId];
        
        if (IReceiptContract(receiptContract).ownerOf(receiptTokenId) != msg.sender) {
            revert NotSlotOwner();
        }
        if (!slot.active) revert SlotNotActive();

        // Find current token in this slot (might not be the original!)
        uint256 currentTokenId = _getCurrentTokenForSlot(slotId);
        
        // Validate NFT exists and we own it before any state changes
        require(IERC721(nftCollection).ownerOf(currentTokenId) == address(this), "SwapPool: Contract doesn't own NFT");
        
        // Remove from pool first (this validates the token exists in pool)
        _removeTokenFromPool(currentTokenId);
        
        // Update slot state
        slot.active = false;
        totalActiveSlots--;
        
        // Remove from user slots
        _removeFromUserSlots(msg.sender, slotId);
        
        // Clean up mappings
        delete receiptToSlot[receiptTokenId];
        delete tokenToSlot[currentTokenId];
        
        // Burn receipt token first (this can revert safely)
        IReceiptContract(receiptContract).burn(receiptTokenId);
        
        // Transfer NFT last (most likely to fail, so do it after state cleanup)
        IERC721(nftCollection).safeTransferFrom(address(this), msg.sender, currentTokenId);

        emit Unstaked(msg.sender, currentTokenId, slotId, receiptTokenId);
        
        return currentTokenId;
    }

    // -------------------- REWARDS --------------------
    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 reward = pendingRewards[msg.sender];
        if (reward == 0) revert NoRewardsToClaim();

        pendingRewards[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Reward transfer failed");

        emit RewardsClaimed(msg.sender, reward);
    }

    function exit()
        external
        whenNotPaused
        onlyInitialized
        updateReward(msg.sender)
    {
        // Unstake all first
        uint256[] memory userSlotIds = userSlots[msg.sender];
        if (userSlotIds.length > 0) {
            require(userSlotIds.length <= maxUnstakeAllLimit, "Too many staked NFTs");
            
            for (uint256 i = userSlotIds.length; i > 0; --i) {
                uint256 slotId = userSlotIds[i - 1];
                uint256 receiptTokenId = poolSlots[slotId].receiptTokenId;
                _unstakeInternal(receiptTokenId);
            }
        }

        // Claim rewards
        uint256 reward = pendingRewards[msg.sender];
        if (reward > 0) {
            pendingRewards[msg.sender] = 0;
            (bool success, ) = payable(msg.sender).call{value: reward}("");
            require(success, "Reward transfer failed");
            emit RewardsClaimed(msg.sender, reward);
        }
    }

    // -------------------- INTERNAL HELPERS --------------------
    function _replaceTokenInPool(uint256 oldTokenId, uint256 newTokenId) internal {
        uint256 tokenIndex = tokenIndexInPool[oldTokenId];
        require(tokenIndex < poolTokens.length, "SwapPool: Invalid token index");
        require(poolTokens[tokenIndex] == oldTokenId, "SwapPool: Token index mismatch");
        require(newTokenId != 0, "SwapPool: Invalid new token ID");
        
        poolTokens[tokenIndex] = newTokenId;
        
        // Update mapping
        tokenIndexInPool[newTokenId] = tokenIndex;
        delete tokenIndexInPool[oldTokenId];
    }
    
    function _removeTokenFromPool(uint256 tokenId) internal {
        require(poolTokens.length > 0, "SwapPool: Pool is empty");
        
        uint256 tokenIndex = tokenIndexInPool[tokenId];
        require(tokenIndex < poolTokens.length, "SwapPool: Invalid token index");
        require(poolTokens[tokenIndex] == tokenId, "SwapPool: Token index mismatch");
        
        uint256 lastIndex = poolTokens.length - 1;
        
        // Only swap if not the last element
        if (tokenIndex != lastIndex) {
            uint256 lastTokenId = poolTokens[lastIndex];
            poolTokens[tokenIndex] = lastTokenId;
            tokenIndexInPool[lastTokenId] = tokenIndex;
        }
        
        poolTokens.pop();
        delete tokenIndexInPool[tokenId];
    }
    
    function _getRandomAvailableToken() internal view returns (uint256) {
        require(poolTokens.length > 0, "No tokens in pool");
        
        // Enhanced randomness with multiple entropy sources for better MEV resistance
        uint256 entropy = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            block.number,
            poolTokens.length,
            totalActiveSlots,
            tx.gasprice
        )));
        
        uint256 randomIndex = entropy % poolTokens.length;
        return poolTokens[randomIndex];
    }

    function _getCurrentTokenForSlot(uint256 slotId) internal view returns (uint256) {
        PoolSlot storage slot = poolSlots[slotId];
        require(slot.active, "Slot not active");
        return slot.currentTokenId;
    }
    
    function _distributeFees(uint256 totalFee) internal {
        uint256 stonerAmount = (totalFee * stonerShare) / 100;
        uint256 rewardsAmount = totalFee - stonerAmount;

        if (stonerAmount > 0) {
            (bool success, ) = payable(stonerPool).call{value: stonerAmount}("");
            require(success, "Stoner pool transfer failed");
        }

        // Distribute rewards to all stakers
        if (rewardsAmount > 0 && totalActiveSlots > 0) {
            uint256 rewardWithCarry = (rewardsAmount * PRECISION) + rewardCarry;
            uint256 rewardPerTokenIncrement = rewardWithCarry / totalActiveSlots;
            rewardCarry = rewardWithCarry % totalActiveSlots;

            rewardPerTokenStored += rewardPerTokenIncrement;
            totalRewardsDistributed += rewardsAmount;
            emit RewardsDistributed(rewardsAmount);
        }

        emit FeeSplit(stonerAmount, rewardsAmount);
    }
    
    function _checkForDuplicates(uint256[] calldata tokenIds) internal pure {
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            for (uint256 j = i + 1; j < tokenIds.length; ++j) {
                require(tokenIds[i] != tokenIds[j], "Duplicate token IDs");
            }
        }
    }
    
    function _removeFromUserSlots(address user, uint256 slotId) internal {
        uint256[] storage slots = userSlots[user];
        for (uint256 i = 0; i < slots.length; ++i) {
            if (slots[i] == slotId) {
                slots[i] = slots[slots.length - 1];
                slots.pop();
                break;
            }
        }
    }

    // -------------------- REWARD VIEWS --------------------
    function rewardPerToken() public view returns (uint256) {
        return rewardPerTokenStored;
    }
    
    function earned(address account) public view returns (uint256) {
        uint256 userActiveSlots = getUserActiveSlotCount(account);
        uint256 currentRewardPerToken = rewardPerToken();
        uint256 userPaid = userRewardPerTokenPaid[account];
        
        // Prevent underflow - if user has been paid more than current rate, no additional rewards
        if (userPaid >= currentRewardPerToken) {
            return pendingRewards[account];
        }
        
        return pendingRewards[account] + 
               (userActiveSlots * (currentRewardPerToken - userPaid)) / PRECISION;
    }
    
    function getUserActiveSlotCount(address user) public view returns (uint256 count) {
        uint256[] memory slots = userSlots[user];
        for (uint256 i = 0; i < slots.length; ++i) {
            if (poolSlots[slots[i]].active) {
                count++;
            }
        }
    }

    // -------------------- VIEWS --------------------
    function getPoolTokens() external view returns (uint256[] memory) {
        return poolTokens;
    }
    
    function getPoolSize() external view returns (uint256) {
        return poolTokens.length;
    }
    
    function getUserSlots(address user) external view returns (uint256[] memory) {
        return userSlots[user];
    }

    function getUserStakes(address user) external view returns (uint256[] memory) {
        // Return receipt token IDs for compatibility
        uint256[] memory slots = userSlots[user];
        uint256[] memory receipts = new uint256[](slots.length);
        for (uint256 i = 0; i < slots.length; ++i) {
            receipts[i] = poolSlots[slots[i]].receiptTokenId;
        }
        return receipts;
    }

    function getContractInfo() external view returns (
        address nft,
        address receipt,
        address stoner,
        uint256 fee,
        uint256 share,
        uint256 poolSize,
        uint256 stakedCount
    ) {
        return (nftCollection, receiptContract, stonerPool, swapFeeInWei, stonerShare, poolTokens.length, totalActiveSlots);
    }

    // -------------------- ADMIN --------------------
    function setSwapFee(uint256 newFeeInWei) external onlyOwner {
        swapFeeInWei = newFeeInWei;
        emit SwapFeeUpdated(newFeeInWei);
    }
    
    function setStonerShare(uint256 newShare) external onlyOwner {
        if (newShare > 100) revert InvalidStonerShare();
        stonerShare = newShare;
        emit StonerShareUpdated(newShare);
    }
    
    function setBatchLimits(uint256 newMaxBatchSize, uint256 newMaxUnstakeAll) external onlyOwner {
            require(newMaxBatchSize > 0 && newMaxBatchSize <= 50, "Invalid batch size");
            require(newMaxUnstakeAll > 0 && newMaxUnstakeAll <= 100, "Invalid unstake limit");
        
        maxBatchSize = newMaxBatchSize;
        maxUnstakeAllLimit = newMaxUnstakeAll;
        emit BatchLimitsUpdated(newMaxBatchSize, newMaxUnstakeAll);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    function emergencyWithdraw(uint256 tokenId) external onlyOwner {
        IERC721(nftCollection).safeTransferFrom(address(this), owner(), tokenId);
    }
    
    function emergencyWithdrawETH() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "ETH transfer failed");
    }

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 92)
        );
        require(_success, "FeeM registration failed");
    }

    // -------------------- ERC721 RECEIVER --------------------
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}